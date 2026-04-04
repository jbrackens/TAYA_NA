from django.conf.urls import url

from virtual_store.views.admin import AdminOrderCreateLogEntryView, AdminOrderListView, AdminOrderRetrieveUpdateView

app_name = "virtual_store"
urlpatterns = [
    url(
        r"^$",
        AdminOrderListView.as_view(),
        name="admin_orders",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))$",
        AdminOrderRetrieveUpdateView.as_view(),
        name="admin_orders_update",
    ),
    url(r"logs$", AdminOrderCreateLogEntryView.as_view(), name="admin_orders_log"),
]
