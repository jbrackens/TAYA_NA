from django.conf.urls import url

from .views import admin_profile

urlpatterns = [
    url(
        r"^(?P<user_sub>gmx_[a-z0-9\-]{32})/socials/(?P<social_account_type>[a-z0-9]{2})$",
        admin_profile.SocialAccountDetailRUDAPIView.as_view(),
        name="admin_social_rud",
    ),
    url(
        r"^(?P<user_sub>gmx_[a-z0-9\-]{32})/socials$",
        admin_profile.SocialAccountDetailListAPIView.as_view(),
        name="admin_social_list",
    ),
    url(
        r"^password/change_by_admin$",
        admin_profile.ChangePasswordByAdminApiView.as_view(),
        name="admin_password_change",
    ),
    url(r"^touch_last_seen$", admin_profile.UpdateUsersLastSeenView.as_view(), name="touch_last_seen"),
    url(
        r"^$",
        admin_profile.CustomProfileCreateListApiView.as_view(),
        name="admin_profile_list",
    ),
    url(
        r"^(?P<user_sub>gmx_[a-z0-9\-]{32})$",
        admin_profile.CustomProfileRUDAPIView.as_view(),
        name="admin_profile_rud",
    ),
    url(
        r"^address/(?P<object_id>[a-z0-9\-]{36})/set_verified$",
        admin_profile.AddressSetVerifiedAPIView.as_view(),
        name="address_set_verified",
    ),
    url(
        r"^email/(?P<object_id>[a-z0-9\-]{36})/set_verified$",
        admin_profile.EmailSetVerifiedAPIView.as_view(),
        name="email_set_verified",
    ),
    url(
        r"^phone/(?P<object_id>[a-z0-9\-]{36})/set_verified$",
        admin_profile.PhoneSetVerifiedAPIView.as_view(),
        name="phone_set_verified",
    ),
]

app_name = "admin_profiles"
