import binascii
import datetime
import json
import logging
import time

from aws_rest_default.pagination import StandardPageNumberPagination
from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.views import DefaultJsonRestViewMixing
from django.db.models import Case, CharField, F, IntegerField, Q, Value, When
from django_filters import rest_framework as filters
from rest_framework import exceptions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
    UpdateAPIView,
    get_object_or_404,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from project.common import SecretBox
from virtual_shop.filters import BaseProductsFilter, OrdersFilter
from virtual_shop.tools import SpecialProductTypeEnum, get_message_id_from_request, pc_service_validate_token

from . import models, serializers
from .tools import validate_datetime_value

logger = logging.getLogger(__name__)


class ProductsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.BaseProductSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()
    pagination_class = StandardPageNumberPagination
    filter_backends = (filters.DjangoFilterBackend,)
    filterset_class = BaseProductsFilter

    def get_queryset(self):
        sb_token = self.request.query_params.get("sb_token", None)
        tags = self.request.query_params.getlist("tag", None)
        choice = models.BaseProductAvailableFor.ModeChoices

        if sb_token is None:
            raise ValidationError({"sb_token": ["Missing param"]})
        if len(sb_token) > 24:
            try:
                api_request = get_message_id_from_request(self.request)
                user_sub = pc_service_validate_token(sb_token=sb_token, api_request=api_request)
            except Exception:
                user_sub = None
        else:
            user_sub = None
        self.kwargs["user_sub"] = user_sub

        sb_token_prefix = sb_token[:3]
        partner_configuration = models.SbTechPartnerConfiguration.get_partner_data(sb_token_prefix)
        if partner_configuration is None:
            raise ValidationError({"sb_token": ["Wrong value"]})

        global_limit_query = models.BaseProduct.objects.filter(
            (
                Q(Product___product_type__partner_configuration__uid=partner_configuration.get("uid"))
                | Q(
                    Package___package_product__product_type__partner_configuration__uid=partner_configuration.get("uid")
                )
            )
            & Q(is_active=True)
            & Q(is_visible=True)
        ).only("pk")

        all_queryset = global_limit_query.all().filter(
            Q(produtcs_available_for__isnull=True) | ~Q(produtcs_available_for__mode=choice.INCLUDE)
        )
        final_query = all_queryset

        if tags and user_sub:
            inc_queryset = global_limit_query.all().filter(
                produtcs_available_for__mode=choice.INCLUDE, produtcs_available_for__tag_member__name__in=tags
            )
            final_query = all_queryset.union(inc_queryset, all=True)

            exc_queries = list(
                [
                    global_limit_query.all().filter(
                        Q(produtcs_available_for__mode=choice.EXCLUDE) & Q(produtcs_available_for__tag_member__name=tag)
                    )
                    for tag in tags
                ]
            )
            for q in exc_queries:
                final_query = final_query.difference(q)

        final_query = (
            models.BaseProduct.objects.filter(pk__in=final_query)
            .annotate(
                ordering=Case(
                    When(package=None, then=Value(None)),
                    When(product=None, then=F("package__package_product_id")),
                    default=Value(None),
                    output_field=CharField(),
                )
            )
            .order_by("ordering", "price")
        )

        return final_query

    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        result = super().get_serializer_context()
        user = self.kwargs.get("user_sub", None)
        result["user"] = user

        return result


class CsAdminProductsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.CsAdminSimpleProductModelSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["wallet:data_export:wallet_line:read"]
    filter_backends = (filters.DjangoFilterBackend,)
    filterset_class = BaseProductsFilter

    def get_queryset(self):
        queryset = models.Product.all_objects.order_by("product_type", "price")

        return queryset


class CsAdminPurchasedProductsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.PurchasedSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["wallet:data_export:wallet_line:read"]
    pagination_class = StandardPageNumberPagination
    queryset = models.PurchasedProductsModel.objects.all()

    def filter_queryset(self, queryset):
        product = self.request.query_params.get("product", None)
        from_date = self.request.query_params.get("from_date", None)
        to_date = self.request.query_params.get("to_date", None)

        if from_date and to_date:
            from_date = validate_datetime_value(from_date)
            to_date = validate_datetime_value(to_date)
            if from_date > to_date:
                raise ValidationError({"date": ["Date is not in valid range"]})
            if from_date == to_date:
                to_date = to_date + datetime.timedelta(days=1)

        if from_date is None or to_date is None:
            raise ValidationError({"date": ["Date range is missing. Please provide `from_date` and `to_date` values"]})
        queryset = queryset.filter(base_product__uid=product, created_at__gte=from_date, created_at__lt=to_date)
        queryset = queryset.annotate(
            calculated_quantity=Case(
                When(base_product__product__isnull=True, then=F("quantity") * F("base_product__package__quantity")),
                default=F("quantity"),
                output_field=IntegerField(),
            )
        )
        queryset = queryset.values(
            "user__username",
            "calculated_quantity",
            "created_at",
            "order__uid",
            "order__external_user_id",
            "base_product__product__uid",
            "base_product__product__title",
            "base_product__product__product_type__name",
            "base_product__product__product_type__subtype_validation",
            "base_product__product__subtype_raw",
            "base_product__product__product_type__partner_configuration__name",
            "base_product__package__uid",
            "base_product__package__title",
            "base_product__package__package_product__product_type__name",
            "base_product__package__package_product__product_type__subtype_validation",
            "base_product__package__package_product__subtype_raw",
            "base_product__package__package_product__product_type__partner_configuration__name",
        ).order_by("-created_at")
        return queryset


class CsAdminOrdersView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.SimpleOrdersModelSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["wallet:data_export:wallet_line:read"]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        user_sub = self.request.query_params.get("user_sub", None)
        if user_sub is None:
            raise ValidationError({"user_sub": ["Missing param"]})

        queryset = models.Order.objects.filter(user__username=user_sub).order_by("-created_at")

        return queryset


class CsAdminTagsWhitelistView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.BaseProductTagSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["wallet:data_export:wallet_line:read"]

    def get_queryset(self):

        queryset = models.BaseProductTag.objects.all().order_by("name")

        return queryset


class CsAdminTagChangeView(DefaultJsonRestViewMixing, RetrieveUpdateDestroyAPIView, CreateAPIView):
    http_method_names = ["delete", "post", "options"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["wallet:data_export:wallet_line:read", "virtual_shop:tag:write"]
    queryset = models.BaseProductTag.objects.all()

    def delete(self, request, *args, **kwargs):
        uid = self.request.data.get("uid")

        try:
            self.queryset.filter(uid=uid).delete()
        except Exception:
            raise ValidationError
        return Response({}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        name = self.request.data.get("name")

        try:
            self.queryset.create(name=name)
        except Exception:
            raise ValidationError
        return Response({}, status=status.HTTP_200_OK)


class PaymentRequestView(DefaultJsonRestViewMixing, CreateAPIView):
    http_method_names = ["post", "options"]
    serializer_class = serializers.PaymentRequestSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()


class PcOrderView(DefaultJsonRestViewMixing, UpdateAPIView):
    http_method_names = ["patch"]
    serializer_class = serializers.SimpleOrderPatchModelSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    queryset = models.Order.objects.all()
    lookup_field = "process_id"
    lookup_url_kwarg = "process_id"
    required_scopes = ["virtual_shop:order:pc:write"]


class PcOrderLineView(DefaultJsonRestViewMixing, CreateAPIView):
    http_method_names = ["post", "options"]
    serializer_class = serializers.SimpleOrderLinePatchModelSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_shop:order:pc:write"]

    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        result = super().get_serializer_context()
        result["order_line_uid"] = self.kwargs.get("order_line_uid")
        return result


class PcBonusesConfigurationView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.BonusesSingleConfigurationSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_shop:order:pc:write"]
    queryset = models.BonusConfiguration.objects.all()


class MyAccountOrdersView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.SimpleOrdersModelSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()
    pagination_class = StandardPageNumberPagination
    filter_backends = (filters.DjangoFilterBackend,)
    filterset_class = OrdersFilter

    def get_queryset(self):
        sb_token = self.request.query_params.get("sb_token", None)
        from_date = self.request.query_params.get("from_date", None)
        to_date = self.request.query_params.get("to_date", None)

        if sb_token is None:
            raise ValidationError({"sb_token": ["Missing param"]})

        if from_date and to_date:
            from_date = validate_datetime_value(from_date)
            to_date = validate_datetime_value(to_date)
            if from_date > to_date:
                raise ValidationError({"date": ["Date is not in valid range"]})
        api_request = get_message_id_from_request(self.request)
        user_sub = pc_service_validate_token(sb_token=sb_token, api_request=api_request)

        if from_date and to_date:
            queryset = (
                models.Order.objects.filter(user__username=user_sub, created_at__gte=from_date, created_at__lt=to_date)
                .exclude(status="ERROR", status_message="Insufficient funds")
                .order_by("-created_at")
            )
        else:
            queryset = (
                models.Order.objects.filter(user__username=user_sub)
                .exclude(status="ERROR", status_message="Insufficient funds")
                .order_by("-created_at")
            )

        return queryset


class MyAccountOrderDetailsView(DefaultJsonRestViewMixing, RetrieveAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.OrderDetailsSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()
    queryset = models.Order.objects.all()

    def get_object(self):

        status_token = self.kwargs.get("status_token")
        try:
            status_token_json = json.loads(SecretBox.decrypt(status_token))
        except binascii.Error:
            raise ValidationError({"status_token": ["Invalid status_token. Check your Order details"]})
        except ValueError:
            raise ValidationError({"status_token": ["Invalid status_token. Check your Order details"]})

        exp = status_token_json.get("e")
        if exp <= int(time.time()):
            raise exceptions.PermissionDenied(detail="Status token has expired.")

        user_sub = status_token_json.get("u")
        uid = status_token_json.get("o")

        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, uid=uid, user__username=user_sub)
        return obj


class PurchasedProductsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.PurchasedSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_shop:data_export:purchased:read"]

    queryset = models.PurchasedProductsModel.objects.all()

    def filter_queryset(self, queryset):
        from_date = self.request.query_params.get("from_date", None)
        to_date = self.request.query_params.get("to_date", None)

        if from_date and to_date:
            from_date = validate_datetime_value(from_date)
            to_date = validate_datetime_value(to_date)
            if from_date > to_date:
                raise ValidationError({"date": ["Date is not in valid range"]})

        if from_date is None or to_date is None:
            raise ValidationError({"date": ["Date range is missing. Please provide `from_date` and `to_date` values"]})

        queryset = queryset.filter(created_at__gte=from_date, created_at__lt=to_date)
        queryset = queryset.annotate(
            calculated_quantity=Case(
                When(base_product__product__isnull=True, then=F("quantity") * F("base_product__package__quantity")),
                default=F("quantity"),
                output_field=IntegerField(),
            )
        )
        queryset = queryset.values(
            "user__username",
            "calculated_quantity",
            "created_at",
            "order__uid",
            "base_product__product__uid",
            "base_product__product__title",
            "base_product__product__product_type__name",
            "base_product__product__product_type__subtype_validation",
            "base_product__product__subtype_raw",
            "base_product__product__product_type__partner_configuration__name",
            "base_product__package__uid",
            "base_product__package__title",
            "base_product__package__package_product__product_type__name",
            "base_product__package__package_product__product_type__subtype_validation",
            "base_product__package__package_product__subtype_raw",
            "base_product__package__package_product__product_type__partner_configuration__name",
        )
        return queryset


class SpecialProductsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.SpecialProductSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_shop:data_export:purchased:read"]
    queryset = models.Product.all_objects.all()

    def filter_queryset(self, queryset):
        from_date = self.request.query_params.get("from_date", None)
        to_date = self.request.query_params.get("to_date", None)

        if from_date and to_date:
            from_date = validate_datetime_value(from_date)
            to_date = validate_datetime_value(to_date)
            if from_date >= to_date:
                raise ValidationError({"date": ["Date is not in valid range"]})
        if from_date is None or to_date is None:
            raise ValidationError({"date": ["Date range is missing. Please provide `from_date` and `to_date` values"]})

        queryset = (
            models.Product.all_objects.filter(
                active_to__gte=from_date,
                active_to__lt=to_date,
                base_product_purchased__order__order_lines__resolved=False,
                base_product_purchased__order__order_lines__base_product__id=F("id"),
            )
            .exclude(product_type__name__contains="charity")
            .values(
                "title",
                "price",
                "active_from",
                "active_to",
                "product_type__partner_configuration__name",
                "base_product_purchased__order__external_user_id",
                "base_product_purchased__order__order_lines__quantity",
                "base_product_purchased__order__order_lines__uid",
            )
            .order_by("uid")
        )

        return queryset


class TagsWhitelistView(DefaultJsonRestViewMixing, ListAPIView):
    serializer_class = serializers.BaseProductTagSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get_queryset(self):
        sb_token = self.request.query_params.get("sb_token", None)

        if sb_token is None:
            raise ValidationError({"sb_token": ["Missing param"]})

        api_request = get_message_id_from_request(self.request)
        pc_service_validate_token(sb_token=sb_token, api_request=api_request)
        queryset = models.BaseProductTag.objects.all()

        return queryset


class SpecialContinuousProductsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.SpecialContinuousProductSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_shop:data_export:purchased:read"]
    queryset = models.Product.all_objects.all()

    def filter_queryset(self, queryset):
        product_type = self.request.query_params.get("product_type", None)
        from_date = self.request.query_params.get("from_date", None)
        to_date = self.request.query_params.get("to_date", None)

        if product_type not in (
            SpecialProductTypeEnum.CHARITY.value,
            SpecialProductTypeEnum.BEST_ODDS_GUARANT.value,
        ):
            raise ValidationError({"product_type": ["Wrong product type"]})

        if from_date and to_date:
            from_date = validate_datetime_value(from_date)
            to_date = validate_datetime_value(to_date)
            if from_date >= to_date:
                raise ValidationError({"date": ["Date is not in valid range"]})
        if from_date is None or to_date is None:
            raise ValidationError({"date": ["Date range is missing. Please provide `from_date` and `to_date` values"]})

        queryset = (
            models.Product.all_objects.filter(
                base_product_purchased__created_at__gte=from_date,
                base_product_purchased__created_at__lt=to_date,
                product_type__name__icontains=product_type,
                base_product_purchased__order__order_lines__resolved=False,
                base_product_purchased__order__order_lines__base_product__id=F("id"),
            )
            .values(
                "title",
                "price",
                "product_type__partner_configuration__name",
                "base_product_purchased__order__external_user_id",
                "base_product_purchased__order__order_lines__quantity",
                "base_product_purchased__order__order_lines__uid",
            )
            .order_by("uid")
        )

        return queryset


class CharityProductsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    serializer_class = serializers.CharityProductSerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_shop:data_export:purchased:read"]
    queryset = models.Product.all_objects.all()

    def filter_queryset(self, queryset):
        from_date = self.request.query_params.get("from_date", None)
        to_date = self.request.query_params.get("to_date", None)

        if from_date and to_date:
            from_date = validate_datetime_value(from_date)
            to_date = validate_datetime_value(to_date)
            if from_date >= to_date:
                raise ValidationError({"date": ["Date is not in valid range"]})
        if from_date is None or to_date is None:
            raise ValidationError({"date": ["Date range is missing. Please provide `from_date` and `to_date` values"]})

        queryset = (
            models.Product.all_objects.filter(
                base_product_purchased__created_at__gte=from_date,
                base_product_purchased__created_at__lt=to_date,
                product_type__name__contains="charity",
                base_product_purchased__order__order_lines__resolved=False,
                base_product_purchased__order__order_lines__base_product__id=F("id"),
            )
            .values(
                "title",
                "price",
                "product_type__partner_configuration__name",
                "base_product_purchased__order__external_user_id",
                "base_product_purchased__order__order_lines__quantity",
                "base_product_purchased__order__order_lines__uid",
            )
            .order_by("uid")
        )

        return queryset
