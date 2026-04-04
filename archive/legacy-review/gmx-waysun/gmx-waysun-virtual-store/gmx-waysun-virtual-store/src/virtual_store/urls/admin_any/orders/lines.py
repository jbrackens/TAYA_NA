from django.conf.urls import url

from virtual_store.views.admin_any import AdminAnyCreateBackpackItemForOrderLineView, AdminAnyOrderLineItemDeliverView

app_name = "virtual_store"
urlpatterns = [
    url(
        r"^create_backpack_items$",
        AdminAnyCreateBackpackItemForOrderLineView.as_view(),
        name="admin_any_orders_lines_create_backpack_items",
    ),
    url(
        r"^items/(?P<sub>([a-fA-f0-9\-]{32,36}))/deliver$",
        AdminAnyOrderLineItemDeliverView.as_view(),
        name="admin_any_orders_lines_items_deliver",
    ),
]
