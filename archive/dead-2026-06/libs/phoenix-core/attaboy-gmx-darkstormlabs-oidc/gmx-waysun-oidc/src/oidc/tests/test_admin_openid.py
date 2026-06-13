import logging
import random

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from oidc.token_tools import PERMISSIONS_LIST
from oidc.views import OpenidExtraRetrieveUpdateAPIView
from profiles import models

logger = logging.getLogger(__name__)


class TestOpenidApiView(AbstractCommonTest):
    target_url_name = "oidc:admin_openid_list"
    target_view_class = OpenidExtraRetrieveUpdateAPIView

    def test_get_openid_details(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:read",),
        )
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        default_permissions_set = [
            x["name"] for x in user_originator_client_extra.default_permissions_set.all().values("name")
        ]
        limited_permissions_set = [
            x["name"] for x in user_originator_client_extra.limited_permissions_set.all().values("name")
        ]
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(sorted(data.get("default_permissions_set")), sorted(default_permissions_set))
        self.assertEqual(sorted(data.get("limited_permissions_set")), sorted(limited_permissions_set))
        self.assertEqual(data.get("social_secrets"), [])

    def test_get_openid_details_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
        )

        self.assertEqual(response.status_code, 403)

    def test_get_openid_details_wrong_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
        )

        self.assertEqual(response.status_code, 405)

    def test_update_openid_details(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()
        default_permissions_set = [random.choice(PERMISSIONS_LIST)[0], random.choice(PERMISSIONS_LIST)[0]]

        data = json.dumps(
            {
                "default_permissions_set": default_permissions_set,
                "limited_permissions_set": default_permissions_set,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(sorted(data.get("default_permissions_set")), sorted(default_permissions_set))
        self.assertEqual(sorted(data.get("limited_permissions_set")), sorted(default_permissions_set))
        self.assertEqual(data.get("social_secrets"), [])

    def test_update_openid_details_with_empty(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "default_permissions_set": [],
                "limited_permissions_set": [],
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("default_permissions_set"), [])
        self.assertEqual(data.get("limited_permissions_set"), [])
        self.assertEqual(data.get("social_secrets"), [])

    def test_update_openid_details_wrong_default(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        limited_permissions_set = [random.choice(PERMISSIONS_LIST)[0], random.choice(PERMISSIONS_LIST)[0]]
        data = json.dumps(
            {
                "default_permissions_set": ["wrong:permission"],
                "limited_permissions_set": limited_permissions_set,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(data.get("default_permissions_set"), ["Not valid permission. Please provide valid permission"])

    def test_update_openid_details_wrong_limited(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        default_permissions_set = [random.choice(PERMISSIONS_LIST)[0], random.choice(PERMISSIONS_LIST)[0]]
        data = json.dumps(
            {
                "default_permissions_set": default_permissions_set,
                "limited_permissions_set": ["wrong:permission"],
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(data.get("limited_permissions_set"), ["Not valid permission. Please provide valid permission"])

    def test_update_openid_details_no_payload(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
        )
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        default_permissions_set = [
            x["name"] for x in user_originator_client_extra.default_permissions_set.all().values("name")
        ]
        limited_permissions_set = [
            x["name"] for x in user_originator_client_extra.limited_permissions_set.all().values("name")
        ]
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(sorted(data.get("default_permissions_set")), sorted(default_permissions_set))
        self.assertEqual(sorted(data.get("limited_permissions_set")), sorted(limited_permissions_set))
        self.assertEqual(data.get("social_secrets"), [])

    def test_update_openid_details_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        default_permissions_set = [random.choice(PERMISSIONS_LIST)[0], random.choice(PERMISSIONS_LIST)[0]]
        data = json.dumps(
            {
                "default_permissions_set": default_permissions_set,
                "limited_permissions_set": default_permissions_set,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:read",),
            data=data,
        )

        self.assertEqual(response.status_code, 403)
