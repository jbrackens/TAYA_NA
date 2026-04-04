from django.conf.urls import url

from virtual_store.views.admin_any import AdminAnySubscriptionsListCreateView, AdminAnySubscriptionsRUDView

app_name = "virtual_store"
urlpatterns = [
    url(r"^$", AdminAnySubscriptionsListCreateView.as_view(), name="admin_any_subscriptions"),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))$",
        AdminAnySubscriptionsRUDView.as_view(),
        name="admin_any_subscriptions_detail",
    ),
]
