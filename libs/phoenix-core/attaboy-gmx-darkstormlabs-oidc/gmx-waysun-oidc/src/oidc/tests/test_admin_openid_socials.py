import logging
import random
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from oidc.models import SocialSecret
from oidc.token_tools import user_info
from oidc.views import OpenidExtraSocialSecretsListIView
from profiles import models
from profiles.factories.social_sercrets import SocialSecretBaseSchemaFactory

logger = logging.getLogger(__name__)


class TestOpenidSocialsApiView(AbstractCommonTest):
    target_url_name = "oidc:admin_openid_social_list"
    target_view_class = OpenidExtraSocialSecretsListIView

    def test_get_openid_social_details(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        user_info(claims={}, user=user)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:read",),
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data[0].get("object_id"), str(social_secret.object_id))
        self.assertEqual(data[0].get("social_type"), social_secret.social_type)
        self.assertEqual(data[0].get("client_id"), social_secret.client_id)
        self.assertEqual(data[0].get("client_secret"), social_secret.client_secret)

        database_social_count = SocialSecret.objects.filter(oidc_client_extra=user_originator_client_extra).count()
        self.assertEqual(database_social_count, len(data))

    def test_get_openid_social_details_empty(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:read",),
        )
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data, [])

    def test_get_openid_social_details_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)

        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
        )

        self.assertEqual(response.status_code, 403)

    def test_get_openid_social_details_wrong_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)

        target_url = self.get_target_url()

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
        )

        self.assertEqual(response.status_code, 405)

    def test_create_openid_social_details(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)

        data = json.dumps(
            {
                "social_type": random.choices(SocialSecret.SocialTypeChoices.choices)[0][0],
                "client_id": uuid4().hex,
                "client_secret": uuid4().hex,
            }
        )
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(post_data.get("object_id"), not None)
        self.assertEqual(post_data.get("social_type"), json.loads(data).get("social_type"))
        self.assertEqual(post_data.get("client_id"), json.loads(data).get("client_id"))
        self.assertEqual(post_data.get("client_secret"), json.loads(data).get("client_secret"))

    def test_create_openid_social_details_with_type_which_was_deleted(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(
            oidc_client_extra=user_originator_client_extra, is_deleted=True
        )
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "social_type": social_secret.social_type,
                "client_id": uuid4().hex,
                "client_secret": uuid4().hex,
            }
        )

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(post_data.get("object_id"), not None)
        self.assertEqual(post_data.get("social_type"), json.loads(data).get("social_type"))
        self.assertEqual(post_data.get("client_id"), json.loads(data).get("client_id"))
        self.assertEqual(post_data.get("client_secret"), json.loads(data).get("client_secret"))

    def test_create_openid_social_details_already_exists(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_type = random.choices(SocialSecret.SocialTypeChoices.choices)[0][0]
        SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra, social_type=social_type)

        data = json.dumps({"social_type": social_type, "client_id": uuid4().hex, "client_secret": uuid4().hex})
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("social_type"), ["This social_type already exist"])
        database_social_count = SocialSecret.objects.filter(oidc_client_extra=user_originator_client_extra).count()
        self.assertEqual(database_social_count, 1)

    def test_create_openid_social_details_wrong_type(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        social_type = uuid4().hex

        data = json.dumps({"social_type": social_type, "client_id": uuid4().hex, "client_secret": uuid4().hex})
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("social_type"), [f'"{social_type}" is not a valid choice.'])

    def test_create_openid_social_details_missing_type(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)

        data = json.dumps({"client_id": uuid4().hex, "client_secret": uuid4().hex})
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("social_type"), ["This field is required."])

    def test_create_openid_social_details_missing_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)

        data = json.dumps({"social_type": uuid4().hex})
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("client_id"), ["This field is required."])
        self.assertEqual(post_data.get("client_secret"), ["This field is required."])

    def test_create_openid_social_details_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        social_type = random.choices(SocialSecret.SocialTypeChoices.choices)[0][0]

        data = json.dumps({"social_type": social_type, "client_id": uuid4().hex, "client_secret": uuid4().hex})
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:read",),
            data=data,
        )

        self.assertEqual(response.status_code, 403)

    def test_create_openid_social_details_no_payload(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
        )

        self.assertEqual(response.status_code, 400)
