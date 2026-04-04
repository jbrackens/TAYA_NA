from django.conf.urls import url

from virtual_store.views.admin import AdminSubscriptionsListCreateView, AdminSubscriptionsRUDView

app_name = "virtual_store"
urlpatterns = [
    url(r"^$", AdminSubscriptionsListCreateView.as_view(), name="admin_subscriptions"),
    url(
        r"^(?P<sub>([a-fA-f0-9\-]{32,36}))$",
        AdminSubscriptionsRUDView.as_view(),
        name="admin_subscriptions_detail",
    ),
]
