import logging

from django.conf import settings

from common.tests.common import AbstractCommonTest
from oidc.views import ClearOidcActionView
from profiles import models

logger = logging.getLogger(__name__)


class TestClearOidcApiView(AbstractCommonTest):
    target_url_name = "oidc:admin__clear_oidc"
    target_view_class = ClearOidcActionView

    def test_clear_oidc(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:clear_oidc:write",),
        )

        self.assertEqual(response.status_code, 200)

    def test_clear_oidc_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:clear_oidc:read",),
        )

        self.assertEqual(response.status_code, 403)

    def test_clear_oidc_wrong_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:clear_oidc:write",),
        )

        self.assertEqual(response.status_code, 405)
