from django.contrib.admin.sites import AdminSite
from django.contrib import admin
import logging


logger = logging.getLogger(__name__)


class WalletAdminSiteMixing(object):
    def get_urls(self):
        from django.conf.urls import url
        from wallet import admin_views
        urls = super().get_urls()
        # Note that custom urls get pushed to the list (not appended)
        # This doesn't work with urls += ...
        urls = [
            url(r'^wallet/bpr/$', self.admin_view(admin_views.BprTransactionsListTemplateView.as_view()), name='wallet_bpr_current'),
            url(r'^wallet/bpr/(?P<year>[0-9]{4})/(?P<month>[0-9]{2})/$', self.admin_view(admin_views.BprTransactionsListTemplateView.as_view()), name='wallet_bpr'),
        ] + urls

        return urls


class ComplexSiteAdmin(WalletAdminSiteMixing, AdminSite):
    site_header = '[GMX] WALLET Site Admin'
    site_title = '[GMX] WALLET Site Admin'
    site_url = '/wallet_docs/'
    index_template = 'admin/index_ext.html'

    def __init__(self, name='admin'):
        super().__init__(name=name)
        admin.site.site_header = self.site_header
        admin.site.site_title = self.site_title
        admin.site.site_url = self.site_url
        self._registry.update(admin.site._registry)   # to load standard registered models


complex_admin = ComplexSiteAdmin(name='admin')

