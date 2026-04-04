import logging

from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.views.profile import CompanyListAPIView

logger = logging.getLogger(__name__)


class TestCompaniesApiView(AbstractCommonTest):
    target_url_name = "company_list"
    target_view_class = CompanyListAPIView

    def test_get_companies(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:company:read",),
        )
        database_users_count = models.Company.objects.all().count()
        self.assertEqual(database_users_count, 1)

        self.assertEqual(response.status_code, 200)

    def test_get_companies_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:company:write",),
        )

        self.assertEqual(response.status_code, 403)

    def test_get_companies_wrong_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:company:read",),
        )

        self.assertEqual(response.status_code, 405)
