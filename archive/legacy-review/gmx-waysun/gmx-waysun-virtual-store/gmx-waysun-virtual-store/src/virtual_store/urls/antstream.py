from django.conf.urls import url
from django.views.decorators.clickjacking import xframe_options_exempt

from virtual_store.views.antstream import AntStreamCreateSubscription

app_name = "virtual_store"

urlpatterns = [
    url(
        r"^create_subscription$",
        xframe_options_exempt(AntStreamCreateSubscription.as_view()),
        name="antstream_create_subscription",
    ),
]
