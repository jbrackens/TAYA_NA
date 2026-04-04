from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^get_or_create_ext_user/bulk/?$', views.ExternalUserCreateBulkView.as_view(), name='external_user_bulk'),
    url(r'^get_or_create_ext_user/?$', views.ExternalUserCreateView.as_view(), name='external_user'),
]
