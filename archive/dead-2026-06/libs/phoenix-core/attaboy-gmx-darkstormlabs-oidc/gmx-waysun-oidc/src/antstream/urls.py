from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^login$", views.AntstreamLoginApiView.as_view(), name="antstream_login"),
]

app_name = "antstream"
