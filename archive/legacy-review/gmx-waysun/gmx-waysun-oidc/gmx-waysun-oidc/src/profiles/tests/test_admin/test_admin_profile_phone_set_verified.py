import logging
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.admin_profile import PhoneSetVerifiedAPIView

logger = logging.getLogger(__name__)


class TestCustomProfilePhoneSetVerifiedApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:phone_set_verified"
    target_view_class = PhoneSetVerifiedAPIView

    def test_set_verified_phone(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, phone_number__is_primary=False, phone_number__is_verified=False
        )
        new_user_phone_object_id = models.Phone.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_phone_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_verified": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:phone_number:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("is_verified"), json.loads(update_data).get("is_verified"))

    def test_set_already_verified_phone(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_phone_object_id = models.Phone.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_phone_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_verified": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:phone_number:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data, ["Editing validated entity is prohibited."])

    def test_set_verified_phone_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_phone_object_id = models.Phone.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_phone_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_verified": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:phone_number:read",),
            data=update_data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_users_phone_no_kwargs(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_phone_object_id = models.Phone.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_phone_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:phone_number:write",),
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_update_own_user_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_phone_object_id = models.Phone.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_phone_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_verified": True,
            }
        )

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:phone_number:write",),
            data=update_data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 405)
