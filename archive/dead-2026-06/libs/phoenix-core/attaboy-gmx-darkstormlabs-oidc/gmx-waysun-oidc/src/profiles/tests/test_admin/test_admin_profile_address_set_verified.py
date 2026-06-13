import logging
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.admin_profile import AddressSetVerifiedAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileAddressSetVerifiedApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:address_set_verified"
    target_view_class = AddressSetVerifiedAPIView

    def test_set_verified_address(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=False
        )
        new_user_address_object_id = models.Address.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_address_object_id}
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
            permissions_required=("oidc:admin:profile:address:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("is_verified"), json.loads(update_data).get("is_verified"))

    def test_set_already_verified_address(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=True
        )
        new_user_address_object_id = models.Address.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_address_object_id}
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
            permissions_required=("oidc:admin:profile:address:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data, ["Editing validated entity is prohibited."])

    def test_set_verified_address_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=True
        )
        new_user_address_object_id = models.Address.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_address_object_id}
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
            permissions_required=("oidc:admin:profile:address:read",),
            data=update_data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_users_address_no_kwargs(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=True, address__is_verified=True
        )
        new_user_address_object_id = models.Address.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_address_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:address:write",),
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_update_own_user_address_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=True, address__is_verified=True
        )
        new_user_address_object_id = models.Address.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_address_object_id}
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
            permissions_required=("oidc:admin:profile:address:write",),
            data=update_data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 405)
