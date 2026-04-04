from django.conf.urls import url
from django.urls import path
from django.views.decorators.clickjacking import xframe_options_exempt

from . import views

app_name = "payment_gateway"


urlpatterns = [
    url(
        r"^china_mobile/pay/(?P<sub>[a-f0-9\-]{36})$",
        xframe_options_exempt(
            views.ChinaMobilePaymentFormView.as_view(),
        ),
        name="cm_payment_pay",
    ),
    url(
        r"^china_mobile/callback$",
        xframe_options_exempt(
            views.ChinaMobilePaymentCallbackView.as_view(),
        ),
        name="cm_payment_callback",
    ),
    path(
        "admin/china_mobile_product_payment",
        views.AdminChinaMobileProductPaymentView.as_view(),
        name="china_mobile_product_payment",
    ),
]
