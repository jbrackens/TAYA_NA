from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^wallet_line/?$', views.WalletLineListApiView.as_view(), name='wallet_line'),
    url(r'^wallet_line_paginated/?$', views.WalletLinePaginatedListApiView.as_view(), name='wallet_line_paginated'),
    url(r'^user_bpr_inc_points_in_circulation/(?P<for_date>20[0-9]{2}-[0-9]{2}-[0-9]{2})/?$', views.ReportDataUserBprIncPointsInCirculationView.as_view(), name='user_bpr_inc_points_in_circulation'),
    url(r'^user_bpr_inc_points_in_circulation/?$', views.ReportDataUserBprIncPointsInCirculationView.as_view(), name='user_bpr_inc_points_in_circulation'),
    url(r'^user_wallet_balance_status/?$', views.ReportUserWalletBalanceView.as_view(), name='user_wallet_balance_status'),
]
