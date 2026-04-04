from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator

from virtual_store.views.admin_any import (
    AdminAnyBackpackItemActivateView,
    AdminAnyBackpackItemDeactivateView,
    AdminAnyBackpackItemDetachView,
    AdminAnyBackpackItemRetrieveView,
    AdminAnyBackpackItemsForUserView,
    AdminAnyOrderCreateLogEntryView,
    AdminAnyOrderListView,
    AdminAnyOrderRetrieveUpdateView,
    AdminAnyProductDetailsRUDView,
    AdminAnyProductListCreateView,
    AdminAnySubscriptionsListCreateView,
    AdminAnySubscriptionsRUDView,
)


# noinspection PyUnresolvedReferences
class OriginatorFilterMixing:
    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        originator_company_sub = self.request.auth.get("extra").get("ops")
        return queryset.filter(partner__sub=originator_company_sub)


class AdminProductListCreateView(OriginatorFilterMixing, AdminAnyProductListCreateView):
    required_scopes = ["virtual_store:admin:product"]
    schema = DefaultGmxSchema(
        tags=["admin - products"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminProductDetailsRUDView(OriginatorFilterMixing, AdminAnyProductDetailsRUDView):
    required_scopes = ["virtual_store:admin:product"]
    schema = DefaultGmxSchema(
        tags=["admin - products"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminSubscriptionsRUDView(OriginatorFilterMixing, AdminAnySubscriptionsRUDView):
    required_scopes = ["virtual_store:admin:subscription"]
    schema = DefaultGmxSchema(
        tags=["admin - subscriptions"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminSubscriptionsListCreateView(OriginatorFilterMixing, AdminAnySubscriptionsListCreateView):
    required_scopes = ["virtual_store:admin:subscription"]
    schema = DefaultGmxSchema(
        tags=["admin - subscriptions"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminOrderListView(OriginatorFilterMixing, AdminAnyOrderListView):
    required_scopes = ["virtual_store:admin:order:read"]
    schema = DefaultGmxSchema(
        tags=["admin - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminOrderCreateLogEntryView(OriginatorFilterMixing, AdminAnyOrderCreateLogEntryView):
    required_scopes = ["virtual_store:admin:order:log:write"]
    schema = DefaultGmxSchema(
        tags=["admin - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminOrderRetrieveUpdateView(OriginatorFilterMixing, AdminAnyOrderRetrieveUpdateView):
    required_scopes = ["virtual_store:admin:order"]
    schema = DefaultGmxSchema(
        tags=["admin - orders"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminBackpackItemRetrieveView(OriginatorFilterMixing, AdminAnyBackpackItemRetrieveView):
    required_scopes = ["virtual_store:admin:backpack_item:read"]
    schema = DefaultGmxSchema(
        tags=["admin - backpack items"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminBackpackItemActivateView(OriginatorFilterMixing, AdminAnyBackpackItemActivateView):
    required_scopes = ["virtual_store:admin:backpack_item:activate"]
    schema = DefaultGmxSchema(
        tags=["admin - backpack items"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminBackpackItemDeactivateView(OriginatorFilterMixing, AdminAnyBackpackItemDeactivateView):
    required_scopes = ["virtual_store:admin:backpack_item:deactivate"]
    schema = DefaultGmxSchema(
        tags=["admin - backpack items"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminBackpackItemDetachView(OriginatorFilterMixing, AdminAnyBackpackItemDetachView):
    required_scopes = ["virtual_store:admin:backpack_item:detach"]
    schema = DefaultGmxSchema(
        tags=["admin - backpack items"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )


class AdminBackpackItemsForUserView(OriginatorFilterMixing, AdminAnyBackpackItemsForUserView):
    required_scopes = ["virtual_store:admin:backpack_item"]
    schema = DefaultGmxSchema(
        tags=["admin - backpack items"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
    )
