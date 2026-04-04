from django.conf.urls import url

from virtual_store.views.antstream import AdminAntstreamConfigurationRetrieveUpdateView

app_name = "virtual_store"
urlpatterns = [
    url(
        r"^configuration$",
        AdminAntstreamConfigurationRetrieveUpdateView.as_view(),
        name="admin_antstream_configuration",
    ),
]
