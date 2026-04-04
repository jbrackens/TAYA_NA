from django.conf.urls import include, url
from django.urls import path

from virtual_store.views.admin_any import (
    AdminAnyOrderCreateLogEntryView,
    AdminAnyOrderListView,
    AdminAnyOrderRetrieveUpdateView,
)

from . import lines

app_name = "virtual_store"
urlpatterns = [
    path("lines/", include(lines.urlpatterns)),
    url(
        r"^$",
        AdminAnyOrderListView.as_view(),
        name="admin_any_orders",
    ),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))$",
        AdminAnyOrderRetrieveUpdateView.as_view(),
        name="admin_any_orders_update",
    ),
    url(r"logs$", AdminAnyOrderCreateLogEntryView.as_view(), name="admin_any_orders_log"),
]
