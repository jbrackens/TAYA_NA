from django.conf.urls import url
from django.urls import path

from . import views

app_name = "oidc"

urlpatterns = [
    path("admin/clear_oidc", views.ClearOidcActionView.as_view(), name="admin__clear_oidc"),
    url(
        r"^openid$",
        views.OpenidExtraRetrieveUpdateAPIView.as_view(),
        name="admin_openid_list",
    ),
    url(
        r"^openid/socials/(?P<social_account_type>[a-z0-9]{2})$",
        views.OpenidExtraSocialSecretsRUDAPIView.as_view(),
        name="admin_openid_social_rud",
    ),
    url(
        r"^openid/socials$",
        views.OpenidExtraSocialSecretsListIView.as_view(),
        name="admin_openid_social_list",
    ),
    path("external_user_mapping", views.ExternalMappingRetrieveView.as_view(), name="external_user_mapping"),
]
