from django.conf.urls import url

from . import views

urlpatterns = [
    # url(r'^$', views.TokenExchangeView.as_view()),  # this was a mock.. disabled
    url(r'^current_balance/?$', views.CurrentBalanceForPaymentTokenView.as_view()),
]