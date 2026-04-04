from django.urls import include, path

from . import admin, admin_any, antstream, user

app_name = "virtual_store"

urlpatterns = [
    path("admin/any/", include(admin_any.urlpatterns)),
    path("admin/", include(admin.urlpatterns)),
    path("", include(user.urlpatterns)),
]
