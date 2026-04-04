from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^external_user_mapping/?$', views.ListExternalUserMappingModelListApiView.as_view()),
    url(r'^custom_user/?$', views.ListCustomUserListApiView.as_view()),
]
