from django.conf.urls import url

from project.dictionary_view import DictionariesView
from . import views

urlpatterns = [
    url(r'^$', views.WalletsListView.as_view()),
    url(r'^dictionaries/?$', DictionariesView.as_view()),
    url(r'^balance/(?P<username>rmx_[a-f0-9]{32})/(?P<company_id>[a-f0-9\-]{36})/?$', views.CurrentBalanceForUserFromCompanyView.as_view()),
    url(r'^balance/(?P<username>rmx_[a-f0-9]{32})/?$', views.CurrentBalanceForUserView.as_view()),
    url(r'^balance/?$', views.CurrentBalanceView.as_view()),
    url(r'^(?P<wallet>[a-f0-9\-]{36})/?$', views.WalletView.as_view()),
    url(r'^(?P<wallet>[a-f0-9\-]{36})/lines/?$', views.WalletLineListView.as_view()),

    # Special for user end points
    url(r'^line/create/from_company/without_commission/?$', views.CreateWalletLineFromCompanyWithCommissionCalculation.as_view()),
    url(r'^line/create/from_company/?$', views.CreateWalletLineFromCompany.as_view()),
    url(r'^line/create/?$', views.CreateWalletLine.as_view()),
    url(r'^bpr/create/from_company/?$', views.CreateBprWalletLineFromCompany.as_view()),
    url(r'^bpr/create/?$', views.CreateBprWalletLine.as_view()),
    url(r'^bpr/silent/list/?$', views.SilentChargeTokenChanelPaymentsList.as_view()),
    url(r'^bpr/silent/?$', views.CreateSilentBprWalletLine.as_view()),

]
