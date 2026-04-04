from django.conf.urls import url

from .views import password, profile

urlpatterns = [
    url(r"^$", profile.ProfileRetrieveUpdateAPIView.as_view(), name="profile_rud"),
    url(r"^password/change$", password.ChangePasswordApiView.as_view(), name="password_change"),
    url(r"^addresses$", profile.AddressListCreateAPIView.as_view(), name="address_list_create"),
    url(
        r"^address/(?P<object_id>[a-z0-9\-]{36})$",
        profile.AddressRetrieveUpdateDestroyAPIView.as_view(),
        name="address_rud",
    ),
    url(
        r"^address/(?P<object_id>[a-z0-9\-]{36})/set_primary$",
        profile.AddressSetIsPrimaryAPIView.as_view(),
        name="address_set_primary",
    ),
    url(r"^emails$", profile.EmailListAPIView.as_view(), name="email_list"),
    url(
        r"^emails/(?P<object_id>[a-z0-9\-]{36})$",
        profile.EmailRetrieveUpdateDestroyAPIView.as_view(),
        name="emails_rud",
    ),
    url(
        r"^emails/(?P<object_id>[a-z0-9\-]{36})/set_primary$",
        profile.EmailSetIsPrimaryAPIView.as_view(),
        name="email_set_primary",
    ),
    url(r"^phones$", profile.PhoneListCreateAPIView.as_view(), name="phone_list_create"),
    url(
        r"^phone/(?P<object_id>[a-z0-9\-]{36})$",
        profile.PhoneRetrieveUpdateDestroyAPIView.as_view(),
        name="phone_rud",
    ),
    url(
        r"^phone/(?P<object_id>[a-z0-9\-]{36})/set_primary$",
        profile.PhoneSetIsPrimaryAPIView.as_view(),
        name="phone_set_primary",
    ),
]

app_name = "profiles"
