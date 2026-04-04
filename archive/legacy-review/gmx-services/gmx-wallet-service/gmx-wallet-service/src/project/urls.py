from django.conf.urls import url
from django.urls import re_path, include
from project.health_check import health_check
from .admin import complex_admin
from rest_framework.documentation import include_docs_urls

urlpatterns = [
    url(r'^health_check/?', health_check),

    url(r'^wallet_admin/', include((complex_admin.get_urls(), 'admin'))),
    url(r'^wallet_docs/', include_docs_urls(title='WALLET REST Docs')),
    # ------------------------------------------------------
    # url(r'^wallet/order/?', include('ext_orders.urls')),
    url(r'^wallet/?', include(('wallet.urls', 'wallet'))),
    url(r'^wallet/data_export/?', include(('data_export.urls', 'data_export'))),
    url(r'^wallet/token/?', include(('token_exchange.urls', 'token_exchange'))),

    re_path(r'', include('aws_rest_default.urls')),
]
