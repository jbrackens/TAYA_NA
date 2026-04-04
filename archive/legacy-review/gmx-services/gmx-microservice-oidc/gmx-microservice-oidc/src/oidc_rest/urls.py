from django.conf.urls import url

from .views import reset_password, registration, validate_email, profile_models

urlpatterns = [
    url(r'^password/change/?$', reset_password.NewPasswordApiView.as_view(), name='password_change'),
    url(r'^password/reset/?$', reset_password.ResetPasswordApiView.as_view(), name='password_reset'),
    url(r'^password/reset/change/?$', reset_password.NewPasswordKeyView.as_view(), name='password_reset__change'),

    url(r'^touch_last_seen/?$', profile_models.UpdateUsersLastSeenView.as_view(), name='touch_last_seen'),

    url(r'^registration/?$', registration.RegistrationCreateApiView.as_view(), name='registration'),

    url(r'^email/verify/?$', validate_email.VerifyEmailApiView.as_view(), name='email_verify'),

    url(r'^email/?$', validate_email.EmailListCreateAPIView.as_view(), name='email_list_create'),
    url(r'^email/(?P<pk>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/?$', profile_models.EmailRetrieveUpdateDestroyAPIView.as_view(), name='emails_rud'),

    url(r'^phone/?$', profile_models.PhoneListCreateAPIView.as_view(), name='phone_list_create'),
    url(r'^phone/(?P<pk>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/?$', profile_models.PhoneRetrieveUpdateDestroyAPIView.as_view(), name='phone_rud'),

    url(r'^address/?$', profile_models.AddressListCreateAPIView.as_view(), name='address_list_create'),
    url(r'^address/(?P<pk>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/?$', profile_models.AddressRetrieveUpdateDestroyAPIView.as_view(), name='address_rud'),

    url(r'^company/(?P<pk>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/?$', profile_models.CompanyRetrieveAPIView.as_view(), name='company_retrieve'),
    url(r'^$', profile_models.ProfileRetrieveUpdateAPIView.as_view(), name='profile_rud'),
]
