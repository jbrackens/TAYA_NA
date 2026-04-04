import logging
from uuid import uuid4

import ujson as json
from django.conf import settings
from freezegun import freeze_time
from freezegun.api import FakeDatetime

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.admin_profile import UpdateUsersLastSeenView

logger = logging.getLogger(__name__)


class TestCustomProfileTouchLastSeenApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:touch_last_seen"
    target_view_class = UpdateUsersLastSeenView

    @freeze_time("2020-01-14 12:00:01")
    def test_account_touch_last_seen(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"sub": new_user.sub})

        self.assertEqual(None, models.CustomUser.objects.get_by_username(new_user.username).last_login)

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:last_seen:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 201)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("sub"), new_user.sub)
        self.assertEqual(post_data.get("updated"), True)
        self.assertEqual(
            FakeDatetime(2020, 1, 14, 12, 0, 1).timestamp(),
            models.CustomUser.objects.get_by_username(new_user.username).last_login.timestamp(),
        )

    def test_account_touch_last_seen_none_existing_sub(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()
        random_uuid = str(uuid4())

        data = json.dumps({"sub": random_uuid})

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:last_seen:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        print(post_data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(post_data.get("sub"), random_uuid)
        self.assertEqual(post_data.get("updated"), False)

    def test_account_touch_last_seen_too_short_sub(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()
        random_uuid = uuid4().hex

        data = json.dumps({"sub": random_uuid})

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:last_seen:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        print(post_data)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("sub"), ["Ensure this field has at least 36 characters."])

    def test_change_account_password_wrong_payload(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"subssss": new_user.sub})

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:last_seen:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("sub"), ["This field is required."])

    def test_account_touch_last_seen_blank_sub(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"sub": ""})

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:last_seen:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("sub"), ["This field may not be blank."])

    def test_account_touch_last_seen_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"sub": new_user.sub})

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:last_seen:read",),
            data=data,
        )
        self.assertEqual(response.status_code, 403)

    def test_account_touch_last_seen_no_payload(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:last_seen:write",),
        )
        self.assertEqual(response.status_code, 400)
