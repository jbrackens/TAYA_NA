from dataclasses import dataclass
from hashlib import md5

from aws_rest_default.logger import RequestLogAdapter
from aws_rest_default.permissions import TokenHasResourceScope
from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator
from aws_rest_default.views import DefaultJsonRestViewMixing, DefaultLogAdapterViewMixing
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import (
    Http404,
    HttpRequest,
    HttpResponseBadRequest,
    HttpResponseNotFound,
    HttpResponseRedirect,
    JsonResponse,
)
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import TemplateView
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated

from virtual_store import models as vs_models

from . import models, serializers


class ChinaMobileReceiptMixing:
    logger: RequestLogAdapter

    @dataclass
    class _PaymentHelper:
        cm_product_payment: models.ChinaMobileProductPaymentModel
        payment_config: models.PaymentConfigurationModel
        cm_payment_config: models.ChinaMobilePaymentConfigurationModel
        order: vs_models.Order
        product: vs_models.Product

    def get_receipt_filtration(self) -> dict:
        return dict()

    def get_queryset(self):
        return (
            models.ReceiptModel.objects.filter(**self.get_receipt_filtration())
            .select_related(
                "user",
                "order",
                "order__partner",
                "order__currency",
                "order__user",
            )
            .prefetch_related(
                "order__order_line_set",
                "order__order_line_set__order_line_items_set",
            )
            .select_for_update(of=("self", "order"))
        )

    def get_receipt(self, sub=None, payment_id=None) -> models.ReceiptModel:
        self.logger.info(f"Locating Payment Receipt for sub={sub} and payment_id={payment_id}")
        if sub:
            queryset = self.get_queryset().filter(sub=sub)
        elif payment_id:
            queryset = self.get_queryset().filter(payment_id=payment_id)
        else:
            self.logger.warning("payment_id or sub must be provided!")
            raise ValidationError("Wrong parameters")
        receipt: models.ReceiptModel = queryset.first()
        if receipt is None:
            self.logger.warning(f"Payment Receipt for sub={sub} not found or already locked")
            raise Http404()
        self.logger.info(f"Located Payment Receipt for sub={sub} with object_id={receipt.object_id}")
        return receipt

    def validate_and_get_config(self, receipt: models.ReceiptModel) -> _PaymentHelper:
        """
        For ChinaMobile payment order must contains only one product
        """
        self.logger.info("Checking configuration for receipt")
        if (count := receipt.order.order_line_set.all().count()) != 1:
            self.logger.warning(f"Receipt has {count} lines! It should have exactly one line")
            raise ValidationError("Wrong payment for this order")
        self.logger.info(f"Lines count - {count} - OK")

        order_line: vs_models.OrderLine = (
            receipt.order.order_line_set.select_related("product").filter(is_deleted=False).first()
        )
        cm_product_payment: models.ChinaMobileProductPaymentModel = (
            models.ChinaMobileProductPaymentModel.objects.filter(product=order_line.product)
            .select_related("payment_config", "payment_config__partner", "partner")
            .first()
        )

        if cm_product_payment is None or not cm_product_payment:
            self.logger.warning(f"Receipt has no China Mobile Payment configuration")
            raise ValidationError("Wrong payment for this order")
        self.logger.info("China Mobile configuration found - OK")

        for required in ("ext_user_id", "valid_time", "expire_time"):
            if required not in receipt.receipt_metadata or not receipt.receipt_metadata.get(required):
                self.logger.warning(f"Missing '{required}' in receipt metadata")
                raise ValidationError("Wrong payment for this order")
            self.logger.info(f"'{required}' found in receipt - OK")

        result = self._PaymentHelper(
            cm_product_payment=cm_product_payment,
            payment_config=cm_product_payment.payment_config,
            cm_payment_config=cm_product_payment.payment_config.config,
            order=receipt.order,
            product=order_line.product,
        )
        return result

    def get_signature(self, receipt: models.ReceiptModel, configuration: _PaymentHelper):
        return md5(  # nosec
            f"{configuration.cm_payment_config.ext_app_secret}"
            f"{configuration.cm_payment_config.ext_app_id}"
            f"{receipt.receipt_metadata.get('valid_time')}"
            f"{receipt.payment_id}"
            f"{receipt.receipt_metadata.get('ext_user_id')}"
            f"{configuration.cm_product_payment.ext_product_id}"
            f"{configuration.cm_product_payment.ext_amount}".encode()  # nosec
        ).hexdigest()  # nosec

    def get_context_data(self, receipt: models.ReceiptModel, configuration: _PaymentHelper, **kwargs) -> dict:
        self.logger.info("Creating context data")
        context = super().get_context_data(**kwargs)  # noqa

        context["target_url"] = configuration.cm_payment_config.ext_payment_url

        context["appid"] = configuration.cm_payment_config.ext_app_id
        context["timestamp"] = receipt.receipt_metadata.get("valid_time")
        context["tranid"] = receipt.payment_id
        context["userId"] = receipt.receipt_metadata.get("ext_user_id")
        context["productId"] = configuration.cm_product_payment.ext_product_id
        context["productName"] = configuration.cm_product_payment.ext_product_name
        context["amount"] = configuration.cm_product_payment.ext_amount
        context["description"] = configuration.cm_product_payment.ext_description
        context["contentId"] = configuration.cm_product_payment.ext_content_id
        context["contentName"] = configuration.cm_product_payment.ext_content_name
        context["orderType"] = configuration.cm_product_payment.ext_order_type
        context["backUrl"] = configuration.cm_payment_config.ext_back_url
        context["commit"] = configuration.cm_product_payment.ext_commit
        context["validTime"] = receipt.receipt_metadata.get("valid_time")
        context["expireTime"] = receipt.receipt_metadata.get("expire_time")
        context["autoSub"] = configuration.cm_product_payment.ext_auto_sub

        context["sign"] = self.get_signature(receipt, configuration)
        return context


class ChinaMobilePaymentFormView(ChinaMobileReceiptMixing, DefaultLogAdapterViewMixing, TemplateView):
    http_method_names = [
        "get",
    ]
    template_name = "payment_gateway/china_mobile/auto_post.html"

    def get_receipt_filtration(self) -> dict:
        return dict(
            payment_status__in=(
                models.ReceiptModel.PaymentStatus.PENDING,
                models.ReceiptModel.PaymentStatus.AWAITING_PAYMENT,
            )
        )

    @method_decorator(xframe_options_exempt)
    def get(self, request, *args, **kwargs):
        with transaction.atomic():  # must be in transaction due to DB lock mechanism
            try:
                receipt = self.get_receipt(sub=self.kwargs.get("sub"))
            except ValidationError as e:
                response = HttpResponseBadRequest(e)
                return response
            except Http404:
                response = HttpResponseNotFound("not found")
                return response
            configuration = self.validate_and_get_config(receipt)

            context = self.get_context_data(receipt, configuration, **kwargs)

            msg = f"Creating payment form with ext_content_id={context.get('contentId')}"
            self.logger.info(msg)
            receipt.add_log(msg)

            receipt.receipt_metadata["ext_content_id"] = context.get("contentId")
            receipt.payment_status = models.ReceiptModel.PaymentStatus.AWAITING_PAYMENT
            receipt.save(update_fields=["payment_status", "receipt_metadata"])

            receipt.order.payment_status = models.ReceiptModel.PaymentStatus.AWAITING_PAYMENT
            receipt.order.order_status = vs_models.Order.OrderStatus.AWAITING_PAYMENT
            receipt.order.save(update_fields=["payment_status", "order_status"])
        self.logger.info("Changed Receipt and Order status to AWAITING_PAYMENT")
        return self.render_to_response(context)


class ChinaMobilePaymentCallbackView(ChinaMobileReceiptMixing, DefaultLogAdapterViewMixing, View):
    http_method_names = ["get", "post"]
    request: HttpRequest

    @method_decorator(csrf_exempt)
    @method_decorator(xframe_options_exempt)
    def dispatch(self, request, *args, **kwargs):
        self.request = request
        return super().dispatch(request, *args, **kwargs)

    def get_signature(self, receipt: models.ReceiptModel, configuration: ChinaMobileReceiptMixing._PaymentHelper):
        if self.request.method.lower() != "post":
            self.logger.warning(f"Unable to calculate signature for {self.request.method}")
            raise ValidationError("wrong request type")
        # noinspection PyCallByClass
        ext_order_id = self.request.POST.get("orderId")  # noqa
        return md5(  # nosec
            f"{configuration.cm_payment_config.ext_app_secret}"
            f"{receipt.payment_id}"
            f"{ext_order_id}"
            f"{receipt.receipt_metadata.get('ext_user_id')}"
            f"{configuration.cm_product_payment.ext_product_id}"
            f"{configuration.cm_product_payment.ext_amount}".encode()  # nosec
        ).hexdigest()  # nosec

    def get(self, request):
        self.logger.info(f"Received GET notification from CM with data: {list(request.GET.items())}")
        payment_success = request.GET.get("payResult") == "0"
        payment_error = request.GET.get("payResult") == "1"
        payment_id = request.GET.get("tranid", "")

        with transaction.atomic():  # must be in transaction due to DB lock mechanism
            try:
                receipt: models.ReceiptModel = self.get_receipt(payment_id=payment_id)
            except Http404:
                response = HttpResponseNotFound("not found")
                return response
            receipt.add_log(f"Received GET notification: {list(request.GET.items())}")
            if receipt.redirect_on_callback:
                if payment_success:
                    redirect_url = receipt.redirect_success_url
                    msg = f"Payment notification was ok so using success response url - '{redirect_url}'"
                    self.logger.info(msg)
                    receipt.add_log(msg)
                else:
                    redirect_url = receipt.redirect_failure_url
                    msg = f"Payment notification was ERROR so using error response url - '{redirect_url}'"
                    self.logger.warning(msg)
                    receipt.add_log(msg)
                if payment_error:
                    try:
                        configuration = self.validate_and_get_config(receipt)
                        self.logger.info(
                            f"Sending payload to Kafka with result={not payment_error}, correlation_id={self.logger.request_msg_id} and partner_sub={configuration.payment_config.partner.sub}"
                        )
                        receipt.process_payment_result(
                            result=not payment_error, correlation_id=self.logger.request_msg_id
                        )
                    except Exception as e:
                        self.logger.info(f"Kafka send error - {e}", exception=True)
                        result = JsonResponse(dict(status="500", code="500"), status=500)
                        result.bypass_wrapping_middleware = True
                        return result

                    self.logger.info(f"Receipt status changing to {receipt.payment_status}")
                    receipt.save()

                    self.logger.info("done")
                self.logger.info(f"redirect_url = {redirect_url}")
                return HttpResponseRedirect(redirect_url)
        return JsonResponse("ok")

    def get_process_engine_payload(self, receipt: models.ReceiptModel):
        return dict(
            payment_id=receipt.payment_id,
            payment_status=receipt.payment_status,
            order_sub=str(receipt.order.sub),
            receipt_sub=str(receipt.sub),
        )

    def post(self, request):
        self.logger.info(f"Received POST notification from CM with data: {list(request.POST.items())}")
        payment_success = request.POST.get("action") == "0"
        payment_id = request.POST.get("tranid", "")

        with transaction.atomic():  # must be in transaction due to DB lock mechanism
            try:
                receipt: models.ReceiptModel = self.get_receipt(payment_id=payment_id)
            except Http404:
                response = HttpResponseNotFound("not found")
                return response

            def log_me(message, exception=False):
                with transaction.atomic():
                    if exception:
                        self.logger.exception(message)
                    else:
                        self.logger.info(message)
                    receipt.add_log(message)

            receipt.add_log(f"Received POST notification: {list(request.POST.items())}")
            if receipt.payment_status not in (receipt.PaymentStatus.PENDING, receipt.PaymentStatus.AWAITING_PAYMENT):
                log_me(f"Receipt status is {receipt.payment_status}. Skipping processing")
                result = JsonResponse(dict(status="0", code="0"))
                result.bypass_wrapping_middleware = True
                return result

            configuration = self.validate_and_get_config(receipt)
            post_signature = request.POST.get("sign")
            correct_signature = self.get_signature(receipt=receipt, configuration=configuration)

            if post_signature != correct_signature:
                self.logger.error("Wrong signature")
                receipt.add_log(f"wrong signature - returning {dict(status='400', code='56120')}")
                result = JsonResponse(dict(status="400", code="56120"))
                result.bypass_wrapping_middleware = True
                return result
            else:
                msg = "Signature ok"
                self.logger.info(msg)
                receipt.add_log(msg)

            try:
                log_me(
                    f"Sending payload to Kafka with result={payment_success}, correlation_id={self.logger.request_msg_id} and partner_sub={configuration.payment_config.partner.sub}"
                )
                receipt.process_payment_result(result=payment_success, correlation_id=self.logger.request_msg_id)
            except Exception as e:
                log_me(f"Kafka send error - {e}", exception=True)
                result = JsonResponse(dict(status="500", code="500"), status=500)
                result.bypass_wrapping_middleware = True
                return result

            log_me(f"Receipt status changing to {receipt.payment_status}")
            receipt.save()

            log_me("done")

        result = JsonResponse(dict(status="0", code="0"))
        result.bypass_wrapping_middleware = True
        return result


class AdminChinaMobileProductPaymentView(DefaultJsonRestViewMixing, RetrieveUpdateAPIView):
    http_method_names = ["patch", "options"]
    serializer_class = serializers.ChinaMobileProductPaymentSerializer
    permission_classes = (IsAuthenticated, TokenHasResourceScope)
    required_scopes = ["payment_gateway:admin:china_mobile:write"]
    queryset = models.ChinaMobileProductPaymentModel.all_objects.all()
    lookup_field = "sub"
    lookup_url_kwarg = "sub"
    authentication_classes = ()
    schema = DefaultGmxSchema(
        tags=["admin - payment gateway - china mobile"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
        # example_responses={
        #     "example-1": {
        #         "count": 2,
        #         "next": False,
        #         "previous": False,
        #         "results": [
        #             {
        #                 "backpack_item": {
        #                     "product": {
        #                         "currency": {
        #                             "sub": "a5a2929e-d23d-403e-bc2a-caab9af7f8ab",
        #                             "name": "Yuan",
        #                             "symbol2": "YA",
        #                             "symbol3": "YUA",
        #                         },
        #                         "sub": "dc968031-737e-482c-9ee5-7f95f66bc08e",
        #                         "title": "Test product",
        #                         "description": "Test product",
        #                         "price": "100.00",
        #                         "product_type": "SP",
        #                         "product_subtype": "VR",
        #                         "stock_quantity": None,
        #                         "sort_index": 0,
        #                         "max_quantity_per_user": None,
        #                         "subscription_duration": 1,
        #                         "subscription_duration_type": "MONTH",
        #                         "subscription_level": 1,
        #                         "photo_small": None,
        #                         "photo_medium": None,
        #                         "photo_large": None,
        #                         "photo_thumbnail": None,
        #                         "photo_purchased": None,
        #                         "photo_not_available": None,
        #                         "photo_index": None,
        #                     },
        #                     "order": {
        #                         "sub": "c6d279ca-fcf8-41b4-b129-350788f14a9f",
        #                         "payment_status": "PENDING",
        #                         "order_status": "IN_PROGRESS",
        #                         "order_sum": "200.00",
        #                     },
        #                     "order_line": {
        #                         "sub": "77ca9e47-da22-4cd7-b377-fe08f00b8a64",
        #                         "provision_status": "PENDING",
        #                         "quantity": 2,
        #                         "price": "50.00",
        #                         "line_sum": "100.00",
        #                     },
        #                     "order_line_items": {
        #                         "sub": "45ca9e47-da22-4cd7-b377-fe08f00b8a64",
        #                         "position": 1,
        #                         "sub_provision_status": "DELIVERED",
        #                     },
        #                     "sub": "9844c9f1-122c-4380-98ba-c484fd71d1e4",
        #                     "is_consumed": True,
        #                     "consumed_at": "2020-09-25T11:51:16.375671Z",
        #                 },
        #                 "is_active": True,
        #                 "sub": "db0d6320-a02c-4fde-ba0d-9602d10145aa",
        #                 "start_date": "2020-09-25T11:51:16.375671Z",
        #                 "end_date": "2020-10-25T11:51:16.375671Z",
        #             },
        #         ],
        #     },
        # },
        # example_requests={
        #     "example-1": {
        #         "start_date": "2020-09-25T11:51:16.375671Z",
        #         "end_date": "2020-10-25T11:51:16.375671Z",
        #     }
        # },
    )
    # TODO
    # def get_queryset(self):
    #     originator_company_sub = self.request.auth.get("extra").get("ops")
    #     queryset = models.UserSubscriptions.objects.filter(product__partner__sub=originator_company_sub).order_by("-end_date")
    #     return queryset
