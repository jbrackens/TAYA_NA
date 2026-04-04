import logging

from aws_rest_default.pagination import StandardPageNumberPagination
from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator
from aws_rest_default.views import DefaultJsonRestViewMixing
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from virtual_store import models, serializers
from virtual_store.filtrers import SubscriptionIsActiveFilter

logger = logging.getLogger(__name__)


class ProductsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_store:product:read"]
    serializer_class = serializers.ProductGetSerializer
    pagination_class = StandardPageNumberPagination
    schema = DefaultGmxSchema(
        tags=["user - products"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
    )

    def get_queryset(self):
        originator_company_sub = self.request.auth.get("extra").get("ops")
        objects_id = [x.object_id for x in models.Product.objects.all() if x.is_active]
        queryset = models.Product.objects.filter(
            object_id__in=objects_id, partner__sub=originator_company_sub, is_public=True
        ).order_by("product_type", "price")
        return queryset


class UsersSubscriptionsView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_store:subscription:read"]
    serializer_class = serializers.SubscriptionGetSerializer
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = SubscriptionIsActiveFilter
    filterset_fields = ["start_date", "end_date"]
    schema = DefaultGmxSchema(
        tags=["user - subscriptions"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
    )

    def get_queryset(self):
        if self.request is None or self.request.auth:
            return models.UserSubscriptions.objects.none()
        user = self.request.user
        queryset = models.UserSubscriptions.objects.filter(user=user).order_by("end_date")
        return queryset


class UsersOrdersView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_store:order:read"]
    serializer_class = serializers.AdminOrderGetSerializer
    pagination_class = StandardPageNumberPagination
    schema = DefaultGmxSchema(
        tags=["user - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
    )

    def get_queryset(self):
        if self.request is None:
            return models.Order.objects.none()
        user = self.request.user
        queryset = models.Order.objects.filter(user=user).order_by("-created_at")
        return queryset
