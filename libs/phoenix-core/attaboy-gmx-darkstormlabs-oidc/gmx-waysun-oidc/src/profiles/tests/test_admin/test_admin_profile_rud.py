import logging

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.admin_profile import CustomProfileRUDAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileRUDApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:admin_profile_rud"
    target_view_class = CustomProfileRUDAPIView

    def test_get_own_user_sub(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        kwargs = {"user_sub": new_user.sub}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:read",),
            kwargs=kwargs,
        )
        database_users_count = models.CustomUser.objects.filter(
            originator__company__sub=user.originator.company.sub
        ).count()
        self.assertEqual(database_users_count, 2)

        self.assertEqual(response.status_code, 200)

    def test_get_own_user_sub_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        kwargs = {"user_sub": new_user.sub}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("unknown_oidc",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_own_user(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        kwargs = {"user_sub": new_user.sub}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "first_name": "UpdatedFirstName",
                "middle_name": "UpdatedMiddleName",
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=update_data,
            kwargs=kwargs,
        )
        patch_data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(patch_data.get("first_name"), json.loads(update_data).get("first_name"))
        self.assertEqual(patch_data.get("middle_name"), json.loads(update_data).get("middle_name"))

    def test_update_users_no_kwargs(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        kwargs = {"user_sub": new_user.sub}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            kwargs={},
        )

        self.assertEqual(response.status_code, 404)

    def test_update_own_user_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        kwargs = {"user_sub": new_user.sub}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "first_name": "UpdatedFirstName",
                "middle_name": "UpdatedMiddleName",
            }
        )

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=update_data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 405)

    def test_delete_own_user(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        kwargs = {"user_sub": new_user.sub}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 204)
