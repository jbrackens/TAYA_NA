import json
import logging

from django.conf import settings
from oidc_provider import models as oidc_models

from common.tests.common import AbstractCommonTest, ProvisionRsaKeyMixing
from oidc.models import OidcPermissions
from profiles import models
from profiles.views.profile import SignSignatureAPIView

logger = logging.getLogger(__name__)


class TestRsaSignApiView(ProvisionRsaKeyMixing, AbstractCommonTest):
    target_url_name = "sign_payload"
    target_view_class = SignSignatureAPIView

    @staticmethod
    def filter_existing_kid_permissions(kid):
        return not OidcPermissions.objects.filter(name=f"oidc:sign:{kid.kid}").exists()

    @staticmethod
    def create_dynamic_kid_permissions(kid):
        logger.info(f"Creating permission for RSA kid: {kid}")
        return OidcPermissions.objects.create(
            name=f"oidc:sign:{kid}", description="Dynamically created permission based on RSA key KID"
        )

    def test_get_sign_payload(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        kid_permission = list(
            map(
                self.create_dynamic_kid_permissions,
                filter(self.filter_existing_kid_permissions, oidc_models.RSAKey.objects.all()),
            )
        )
        data = json.dumps({"payload": "this is example payload"})
        kid = kid_permission[0].name.replace("oidc:sign:", "")
        kwargs = {"kid": kid}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=(kid_permission[0].name,),
            kwargs=kwargs,
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(post_data.get("signature"))

    def test_get_sign_payload_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        kid_permission = list(
            map(
                self.create_dynamic_kid_permissions,
                filter(self.filter_existing_kid_permissions, oidc_models.RSAKey.objects.all()),
            )
        )
        data = json.dumps({"payload": "this is example payload"})
        kid = kid_permission[0].name.replace("oidc:sign:", "")
        kwargs = {"kid": kid}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:sign:",),
            kwargs=kwargs,
            data=data,
        )

        self.assertEqual(response.status_code, 403)

    def test_get_sign_payload_wrong_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)

        kid_permission = list(
            map(
                self.create_dynamic_kid_permissions,
                filter(self.filter_existing_kid_permissions, oidc_models.RSAKey.objects.all()),
            )
        )
        data = json.dumps({"payload": "this is example payload"})
        kid = kid_permission[0].name.replace("oidc:sign:", "")
        kwargs = {"kid": kid}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=(kid_permission[0].name,),
            kwargs=kwargs,
            data=data,
        )
        self.assertEqual(response.status_code, 405)
