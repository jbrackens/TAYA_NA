from dataclasses import dataclass

from aws_rest_default.permissions import TokenHasResourceScope
from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator
from aws_rest_default.signals import MISSING_USER_SIGNAL
from aws_rest_default.views import DefaultJsonRestViewMixing, DefaultLogAdapterViewMixing
from django.core.exceptions import ValidationError
from django.db import transaction
from django.urls import reverse
from django.views.generic import RedirectView
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated

from common.tools import SECRET_BOX
from payment_gateway.models import ChinaMobilePaymentConfigurationModel
from payment_gateway.payment_tools import create_antstream_payment_receipt
from virtual_store import models, order_tools, serializers


class AdminAntstreamConfigurationRetrieveUpdateView(DefaultJsonRestViewMixing, RetrieveUpdateAPIView):
    http_method_names = ["get", "patch"]
    permission_classes = (IsAuthenticated, TokenHasResourceScope)
    required_scopes = ["virtual_store:admin:antstream:configuration"]
    serializer_class = serializers.AntstreamConfigurationSerializer
    schema = DefaultGmxSchema(
        tags=["antstream - configuration"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        return models.Partner.objects.all()

    def get_object(self) -> models.Partner:
        return self.get_queryset().get(name=models.Partner.PartnerTypes.ANTSTREAM)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["partner_sub"] = self.get_object().sub
        return context


class AntStreamCreateSubscription(DefaultLogAdapterViewMixing, RedirectView):
    """
    Query params supported:
    * `order_token` - required - an order token from OIDC
    * `product_sub` - optional - an product sub, when not entered the default will be used
    * `success_url` - optional - a success URL redirection after payment
    * `error_url`   - optional - an error URL redirection after payment
    """

    permanent = False
    http_method_names = [
        "get",
    ]

    @dataclass
    class _ConfigHelper:
        product: models.Product
        partner: models.Partner
        cm_config: ChinaMobilePaymentConfigurationModel
        success_url: str
        error_url: str
        order_token_max_age: int

    def _get_antstream_configuration(self, request) -> _ConfigHelper:
        partner = models.Partner.objects.filter(name=models.Partner.PartnerTypes.ANTSTREAM).first()
        if partner is None or not partner:
            self.logger.error("Unable to fetch partner configuration for AntStream")
            raise ValidationError("missing configuration")

        product = self._get_product_from_request(partner, request)

        cm_config: ChinaMobilePaymentConfigurationModel = ChinaMobilePaymentConfigurationModel.objects.filter(
            payment_configuration__partner=partner
        ).first()
        if cm_config is None or not cm_config:
            self.logger.error("Unable to fetch CM configuration for AntStream")
            raise ValidationError("missing configuration")

        success_url = cm_config.check_success_url(request.GET.get("success_url"))
        error_url = cm_config.check_error_url(request.GET.get("error_url"))

        self.logger.info(f"Located success url as {success_url}")
        self.logger.info(f"Located error url as {error_url}")

        return self._ConfigHelper(
            product=product,
            partner=partner,
            order_token_max_age=partner.partner_meta.get("order_token_max_age"),
            success_url=success_url,
            error_url=error_url,
            cm_config=cm_config,
        )

    def _get_product_from_request(self, partner, request):
        product_sub = request.GET.get("product_sub", None)
        self.logger.info(f"locating product with sub={product_sub}")
        if product_sub is None or not product_sub:
            product_sub = partner.partner_meta.get("default_product_sub")
            self.logger.info(f"replacing to default {product_sub}")
        product = models.Product.objects.filter(partner=partner, sub=product_sub).first()
        if product is None or not product:
            self.logger.error(f"unable to find product for sub={product_sub}")
            raise ValidationError("wrong product")
        if not product.is_active:
            self.logger.error(f"product sub={product_sub} is not active")
            raise ValidationError("inactive product")
        self.logger.info(f"found product with object_id={product.object_id}")
        return product

    def get_redirect_url(self, *args, **kwargs):
        request = self.request
        self.logger.info("loading configuration for antstream")
        config_helper = self._get_antstream_configuration(request)
        token_data = self._get_token_data(max_age=config_helper.order_token_max_age, request=request)
        user_sub = token_data.get("u")
        cm_user_id = token_data.get("e")
        user_originator_sub = token_data.get("o")
        user_is_test = token_data.get("t", 0) == 1
        self.logger.info(f"token data decoded as {token_data}")
        try:
            self.logger.info(f"Locating user({user_sub}")
            user = models.CustomUser.objects.get_by_natural_key(user_sub)
        except models.CustomUser.DoesNotExist:
            self.logger.warning(f"user_sub({user_sub}) not found - sending MISSING USER signal")
            MISSING_USER_SIGNAL.send(
                sender=self.__class__, username=user_sub, originator=user_originator_sub, is_test_user=user_is_test
            )
            self.logger.info(f"Locating user({user_sub} - again")
            user = models.CustomUser.objects.get_by_natural_key(user_sub)

        self.logger.info(f"found user_sub={user_sub} and cm={cm_user_id}")
        with transaction.atomic():
            self.logger.info("creating order")
            order, _, _ = order_tools.create_antstream_order(
                user=user, partner=config_helper.partner, product=config_helper.product
            )
            self.logger.info(f"Order {order.sub} created")
            self.logger.info("creating receipt")
            receipt = create_antstream_payment_receipt(
                user=user,
                order=order,
                product=config_helper.product,
                china_mobile_user_id=cm_user_id,
                cm_app_id=config_helper.cm_config.ext_cp_id,
                success_url=config_helper.success_url,
                error_url=config_helper.error_url,
            )
            self.logger.info(f"receipt(payment_id={receipt.payment_id}, sub={receipt.sub}) created.")
            redirect_url = reverse("payment_gateway:cm_payment_pay", kwargs=dict(sub=receipt.sub))

            redirect_url = config_helper.cm_config.convert_url_to_proxy(redirect_url)

            self.logger.info(f"redirecting to {redirect_url}")
        return redirect_url

    def _get_token_data(self, max_age, request) -> dict:
        try:
            order_token = request.GET.get("order_token")
            if order_token is None or not order_token:
                self.logger.error("missing order_token")
                raise ValidationError("missing token")
            token_data = SECRET_BOX.decrypt(order_token, max_age=max_age)  # noqa
        except Exception as e:
            self.logger.exception(e)
            raise ValidationError("wrong token")
        return token_data
