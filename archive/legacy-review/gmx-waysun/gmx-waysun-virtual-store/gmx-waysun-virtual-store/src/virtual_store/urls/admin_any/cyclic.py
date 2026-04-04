from django.conf.urls import url

from virtual_store.views.admin_any import AdminAnyGetAndSendUserSubscriptionForDeactivationView

app_name = "virtual_store"
urlpatterns = [
    url(
        r"^subscription_deactivate$",
        AdminAnyGetAndSendUserSubscriptionForDeactivationView.as_view(),
        name="admin_any_cyclic_subscription_deactivate",
    ),
]
