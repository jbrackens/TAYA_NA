import logging
import random
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from oidc.models import SocialSecret
from oidc.views import OpenidExtraSocialSecretsRUDAPIView
from profiles import models
from profiles.factories.social_sercrets import SocialSecretBaseSchemaFactory

logger = logging.getLogger(__name__)


class TestOpenidSocialsRUDApiView(AbstractCommonTest):
    target_url_name = "oidc:admin_openid_social_rud"
    target_view_class = OpenidExtraSocialSecretsRUDAPIView

    def test_get_openid_social_details_rud(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        kwargs = {"social_account_type": social_secret.social_type}

        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:read",),
            kwargs=kwargs,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("object_id"), str(social_secret.object_id))
        self.assertEqual(data.get("social_type"), social_secret.social_type)
        self.assertEqual(data.get("client_id"), social_secret.client_id)
        self.assertEqual(data.get("client_secret"), social_secret.client_secret)

    def test_get_openid_social_details_rud_empty(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        kwargs = {"social_account_type": random.choices(SocialSecret.SocialTypeChoices.choices)[0][0]}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:read",),
            kwargs=kwargs,
        )
        data = json.loads(response.content)
        print(data)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(data.get("detail"), "Not found.")

    def test_get_openid_social_details_rud_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        kwargs = {"social_account_type": social_secret.social_type}

        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_get_openid_social_details_rud_wrong_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        kwargs = {"social_account_type": social_secret.social_type}

        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 405)

    def test_update_openid_social_details_rud(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        kwargs = {"social_account_type": social_secret.social_type}

        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "client_id": uuid4().hex,
                "client_secret": uuid4().hex,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
            kwargs=kwargs,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(post_data.get("object_id"), not None)
        self.assertEqual(post_data.get("social_type"), social_secret.social_type)
        self.assertEqual(post_data.get("client_id"), json.loads(data).get("client_id"))
        self.assertEqual(post_data.get("client_secret"), json.loads(data).get("client_secret"))

    def test_update_openid_social_details_rud_not_existing(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        not_existing_social_type = random.choice(
            [x for x in SocialSecret.SocialTypeChoices.choices if x[0] != social_secret.social_type]
        )[0]
        kwargs = {"social_account_type": not_existing_social_type}

        data = json.dumps({"client_id": uuid4().hex, "client_secret": uuid4().hex})
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
            kwargs=kwargs,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(post_data.get("detail"), "Not found.")

    def test_update_openid_social_details_rud_wrong_type(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        social_type = uuid4().hex[0:2]
        kwargs = {"social_account_type": social_type}

        data = json.dumps({"client_id": uuid4().hex, "client_secret": uuid4().hex})
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
            kwargs=kwargs,
        )
        post_data = json.loads(response.content)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(post_data.get("detail"), "Not found.")

    def test_update_openid_social_details_rud_illegal_change_type(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        not_existing_social_type = random.choice(
            [x for x in SocialSecret.SocialTypeChoices.choices if x[0] != social_secret.social_type]
        )[0]
        kwargs = {"social_account_type": social_secret.social_type}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {"social_account_type": not_existing_social_type, "client_id": uuid4().hex, "client_secret": uuid4().hex}
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            data=data,
            kwargs=kwargs,
        )
        post_data = json.loads(response.content)
        print(post_data)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(post_data.get("object_id"), not None)
        self.assertEqual(post_data.get("social_type"), social_secret.social_type)
        self.assertNotEqual(post_data.get("social_type"), not_existing_social_type)
        self.assertEqual(post_data.get("client_id"), json.loads(data).get("client_id"))
        self.assertEqual(post_data.get("client_secret"), json.loads(data).get("client_secret"))

    def test_update_openid_social_details_rud_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        kwargs = {"social_account_type": social_secret.social_type}

        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "client_id": uuid4().hex,
                "client_secret": uuid4().hex,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:read",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 403)

    def test_update_openid_social_details_rud_no_payload(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        kwargs = {"social_account_type": social_secret.social_type}

        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            kwargs=kwargs,
        )

        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(post_data.get("social_type"), social_secret.social_type)
        self.assertEqual(post_data.get("client_id"), social_secret.client_id)
        self.assertEqual(post_data.get("client_secret"), social_secret.client_secret)

    def test_delete_openid_social_details_rud(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(oidc_client_extra=user_originator_client_extra)
        kwargs = {"social_account_type": social_secret.social_type}

        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 204)
        database_social_count = SocialSecret.all_objects.filter(
            oidc_client_extra=user_originator_client_extra, is_deleted=True
        ).count()
        self.assertEqual(database_social_count, 1)

    def test_delete_openid_social_details_rud_already_deleted(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_originator_client_extra = user.originator.oidc_client_extra.first()
        social_secret = SocialSecretBaseSchemaFactory.create(
            oidc_client_extra=user_originator_client_extra, is_deleted=True
        )
        kwargs = {"social_account_type": social_secret.social_type}

        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:openid:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 404)
