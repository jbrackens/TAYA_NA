import logging

from aws_rest_default.pagination import StandardPageNumberPagination
from aws_rest_default.permissions import TokenHasResourceScope, TokenHasScope
from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator
from aws_rest_default.views import DefaultJsonRestViewMixing
from django.db import transaction
from django.db.models import QuerySet
from django.http import Http404
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response

from events.client import UserBackpackIngestorClient
from virtual_store import models, serializers
from virtual_store.filtrers import SubscriptionIsActiveFilter

logger = logging.getLogger(__name__)


class GetObjectAndLockMixing:
    # noinspection PyUnresolvedReferences
    def get_object_and_lock(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        query_set: QuerySet = self.get_queryset().filter(is_deleted=False)
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        self.logger.info(f"Locking {query_set.model}({filter_kwargs})")
        item = query_set.filter(**filter_kwargs)

        if item is None or not item:
            msg = f"{query_set.model}({filter_kwargs}) not found"
            self.logger.error(msg)
            raise Http404(msg)

        item = item.select_for_update().first()
        return item


class AdminAnyProductListCreateView(DefaultJsonRestViewMixing, ListCreateAPIView):
    http_method_names = ["get", "post", "options"]
    permission_classes = (IsAuthenticated, TokenHasResourceScope)
    required_scopes = ["virtual_store:admin:any:product"]
    serializer_class = serializers.AdminProductGetCreateSerializer
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product_type", "product_subtype", "is_public"]
    schema = DefaultGmxSchema(
        tags=["any - admin - products"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        if self.request is None:
            return models.Product.objects.none()
        queryset = models.Product.objects.filter(is_deleted=False).order_by("product_type", "price")
        return queryset


class AdminAnyProductDetailsRUDView(DefaultJsonRestViewMixing, RetrieveUpdateDestroyAPIView):
    http_method_names = ["get", "patch", "delete", "options"]
    serializer_class = serializers.SimpleAdminProductModelSerializer
    lookup_field = "sub"
    lookup_url_kwarg = "sub"
    permission_classes = (IsAuthenticated, TokenHasResourceScope)
    required_scopes = ["virtual_store:admin:any:product"]
    schema = DefaultGmxSchema(
        tags=["any - admin - products"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        if self.request is None:
            return models.Product.objects.none()
        queryset = models.Product.objects.filter(is_deleted=False)
        return queryset


class AdminAnySubscriptionsRUDView(DefaultJsonRestViewMixing, RetrieveUpdateDestroyAPIView):
    http_method_names = ["get", "patch", "delete", "options"]
    permission_classes = (IsAuthenticated, TokenHasResourceScope)
    required_scopes = ["virtual_store:admin:any:subscription"]
    serializer_class = serializers.SubscriptionWithUserAdminSerializer
    lookup_field = "sub"
    lookup_url_kwarg = "sub"
    schema = DefaultGmxSchema(
        tags=["any - admin - subscriptions"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        queryset = models.UserSubscriptions.objects.filter(is_deleted=False).select_related("user", "backpack_item")
        return queryset


class AdminAnySubscriptionsListCreateView(DefaultJsonRestViewMixing, ListCreateAPIView):
    http_method_names = ["get", "post", "options"]
    permission_classes = (IsAuthenticated, TokenHasResourceScope)
    required_scopes = ["virtual_store:admin:any:subscription"]
    serializer_class = serializers.SubscriptionGetSerializer
    create_serializer_class = serializers.SubscriptionCreateFromBackpackItemSerializer
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = SubscriptionIsActiveFilter
    filterset_fields = ["start_date", "end_date"]
    schema = DefaultGmxSchema(
        tags=["any - admin - subscriptions"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
    )

    def get_serializer_class(self):
        if getattr(self.request, "method", None) in SAFE_METHODS:
            return self.serializer_class
        return self.create_serializer_class

    def get_queryset(self):
        if self.request is None or self.request.auth is None:
            return models.UserSubscriptions.objects.none()
        queryset = models.UserSubscriptions.objects.filter(is_deleted=False).order_by(
            "backpack_item__user", "-end_date"
        )
        return queryset


class AdminAnyOrderListView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_store:admin:any:order:read"]
    serializer_class = serializers.AdminOrderGetSerializer
    pagination_class = StandardPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    schema = DefaultGmxSchema(
        tags=["any - admin - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        if self.request is None:
            return models.Order.objects.none()
        queryset = (
            models.Order.objects.filter(is_deleted=False)
            .select_related(
                "user",
                "currency",
            )
            .prefetch_related(
                "order_line_set",
                "order_line_set__product",
                "order_line_set__order_line_items_set",
            )
            .order_by("user", "-created_at")
        )
        return queryset


class AdminAnyOrderRetrieveUpdateView(DefaultJsonRestViewMixing, RetrieveUpdateAPIView):
    http_method_names = ["get", "patch"]
    permission_classes = (IsAuthenticated, TokenHasResourceScope)
    required_scopes = ["virtual_store:admin:any:order"]
    serializer_class = serializers.AdminOrderGetSerializer
    lookup_field = "sub"
    lookup_url_kwarg = "sub"
    schema = DefaultGmxSchema(
        tags=["any - admin - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        return models.Order.objects.filter(is_deleted=False)


class AdminAnyCreateBackpackItemForOrderLineView(DefaultJsonRestViewMixing, CreateAPIView):
    http_method_names = ["post"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_store:admin:any:order:backpack:create"]
    serializer_class = serializers.AdminCreateBackpackItemForOrderLineSerializer
    schema = DefaultGmxSchema(
        tags=["any - admin - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminAnyBackpackItemMixing:
    http_method_names = ["patch"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    lookup_field = "sub"
    lookup_url_kwarg = "sub"
    serializer_class = serializers.BackPackItemSerializer
    schema = DefaultGmxSchema(
        tags=["any - admin - backpack items"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        return models.BackpackItem.objects.filter(is_deleted=False).select_related(
            "product",
            "user",
            "order",
            "order_line",
            "order_line_item",
        )


class AdminAnyBackpackItemRetrieveView(AdminAnyBackpackItemMixing, DefaultJsonRestViewMixing, RetrieveAPIView):
    http_method_names = ["get"]
    required_scopes = ["virtual_store:admin:any:backpack_item:read"]


class AdminAnyBackpackItemActivateView(
    AdminAnyBackpackItemMixing, GetObjectAndLockMixing, DefaultJsonRestViewMixing, UpdateAPIView
):
    required_scopes = ["virtual_store:admin:any:backpack_item:activate"]

    def partial_update(self, request, *args, **kwargs):
        with transaction.atomic():
            instance: models.BackpackItem = self.get_object_and_lock()
            self.logger.info(f"Backpack({instance.sub}) is being activated")
            instance.activate(correlation_id=self.logger.request_msg_id)
            UserBackpackIngestorClient.send_product_activated(
                product_id=instance.product.sub,
                active_to=(
                    None
                    if not instance.product.subscription_duration or not instance.product.subscription_duration_type
                    else now() + instance.product.get_time_delta_for_subscription()
                ),
                on_behalf_of_user_id=instance.user.username,
                on_behalf_of_company_id=self.request.auth.get("extra").get("ops"),
                correlation_id=self.logger.request_msg_id,
            )
            self.logger.info(f"Backpack({instance.sub}) is being activated - done")
            serializer = self.get_serializer(instance)
            return Response(serializer.data)


class AdminAnyBackpackItemDeactivateView(
    AdminAnyBackpackItemMixing, GetObjectAndLockMixing, DefaultJsonRestViewMixing, UpdateAPIView
):
    required_scopes = ["virtual_store:admin:any:backpack_item:deactivate"]

    def partial_update(self, request, *args, **kwargs):
        with transaction.atomic():
            instance: models.BackpackItem = self.get_object_and_lock()
            self.logger.info(f"BackpackItem({instance.sub}) is being deactivated")
            instance.deactivate()
            UserBackpackIngestorClient.send_product_deactivated(
                product_id=instance.product.sub,
                on_behalf_of_user_id=instance.user.username,
                on_behalf_of_company_id=self.request.auth.get("extra").get("ops"),
                correlation_id=self.logger.request_msg_id,
            )
            self.logger.info(f"BackpackItem({instance.sub}) is being deactivated - done")
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class AdminAnyBackpackItemDetachView(
    AdminAnyBackpackItemMixing, GetObjectAndLockMixing, DefaultJsonRestViewMixing, UpdateAPIView
):
    required_scopes = ["virtual_store:admin:any:backpack_item:detach"]

    def partial_update(self, request, *args, **kwargs):
        with transaction.atomic():
            instance: models.BackpackItem = self.get_object_and_lock()
            self.logger.info(f"BackpackItem({instance.sub}) is being detached")
            instance.detach()
            UserBackpackIngestorClient.send_product_detached(
                product_id=instance.product.sub,
                on_behalf_of_user_id=instance.user.username,
                on_behalf_of_company_id=self.request.auth.get("extra").get("ops"),
                correlation_id=self.logger.request_msg_id,
            )
            self.logger.info(f"BackpackItem({instance.sub}) is being detached - done")
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class AdminAnyBackpackItemsForUserView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get"]
    permission_classes = (IsAuthenticated, TokenHasResourceScope)
    required_scopes = ["virtual_store:admin:any:backpack_item"]
    lookup_url_kwarg = "user_sub"
    serializer_class = serializers.BackPackItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_activated", "is_consumed"]
    schema = DefaultGmxSchema(
        tags=["any - admin - backpack items"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        if self.request is None or self.request.auth is None:
            return models.BackpackItem.objects.none()
        return models.BackpackItem.objects.filter(is_deleted=False).select_related(
            "product",
            "user",
            "order",
            "receipt",
            "order_line",
            "order_line_item",
        )

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        queryset = queryset.filter(user__username=self.kwargs.get(self.lookup_url_kwarg)).order_by(
            "is_activated", "is_consumed"
        )
        return queryset


class AdminAnyOrderCreateLogEntryView(DefaultJsonRestViewMixing, CreateAPIView):
    http_method_names = ["post"]
    serializer_class = serializers.CreateLogEntrySerializer
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_store:admin:any:order:log:write"]
    schema = DefaultGmxSchema(
        tags=["any - admin - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminAnyOrderLineItemDeliverView(DefaultJsonRestViewMixing, UpdateAPIView):
    http_method_names = ["patch"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_store:admin:any:order:deliver"]
    lookup_field = "sub"
    lookup_url_kwarg = "sub"
    serializer_class = serializers.OrderLineItemSerializer
    schema = DefaultGmxSchema(
        tags=["any - admin - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def get_queryset(self):
        return models.OrderLineItem.objects.filter(is_deleted=False).select_related(
            "order_line",
            "order_line__order",
        )

    def partial_update(self, request, *args, **kwargs):
        with transaction.atomic():
            instance: models.OrderLineItem = self.get_object()
            self.logger.info(f"OrderLineItem({instance.sub}) is being delivered")
            instance.deliver()
            self.logger.info(f"OrderLineItem({instance.sub}) delivered")
            serializer = self.get_serializer(instance)
            return Response(serializer.data)


class AdminAnyGetAndSendUserSubscriptionForDeactivationView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ["get", "options"]
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ["virtual_store:admin:any:cyclic:subscriptions:deactivate"]
    serializer_class = serializers.SubSerializer
    pagination_class = None
    schema = DefaultGmxSchema(
        tags=["any - admin - subscriptions"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )

    def list(self, request, *args, **kwargs):
        with transaction.atomic():
            items = models.UserSubscriptions.get_and_send_for_deprovisioning(correlation_id=self.logger.request_msg_id)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)
