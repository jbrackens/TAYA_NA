from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^transaction_keys/?$', views.PartnerTransactionApiKeysView.as_view(), name='transaction_keys'),
    url(r'^transaction_keys/recreate/?$', views.PartnerTransactionApiKeysRecreateView.as_view(), name='transaction_keys_recreate'),

    url(r'^details/(?P<key>[0-9a-z\-]{36})$/?', views.GetExternalOrderDetails.as_view(), name='details'),
    url(r'^finalize/(?P<key>[0-9a-z\-]{36})$/?', views.FinalizeExternalOrder.as_view(), name='finalize'),

    # No Auth required!
    url(r'(?P<public_key>[0-9a-z]{16})$', views.ValidateExternalOrder.as_view(), name='public_key'),
]
