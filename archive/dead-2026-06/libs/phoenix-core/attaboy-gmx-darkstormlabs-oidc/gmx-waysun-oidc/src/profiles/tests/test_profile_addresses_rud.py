import logging
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.profile import AddressRetrieveUpdateDestroyAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileAddressRUDAPIView(AbstractCommonTest):
    target_url_name = "profiles:address_rud"
    target_view_class = AddressRetrieveUpdateDestroyAPIView

    def test_get_own_profile_address(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:read",),
            kwargs=kwargs,
        )

        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(data.get("object_id"))
        self.assertEqual(len(data), 9)
        self.assertEqual(data.get("country"), new_user_address.country)
        self.assertEqual(data.get("line_1"), new_user_address.line_1)
        self.assertEqual(data.get("line_2"), new_user_address.line_2)
        self.assertEqual(data.get("city"), new_user_address.city)
        self.assertEqual(data.get("post_code"), new_user_address.post_code)
        self.assertEqual(data.get("region"), new_user_address.region)
        self.assertEqual(data.get("is_verified"), new_user_address.is_verified)
        self.assertEqual(data.get("is_primary"), new_user_address.is_primary)

    def test_get_own_profile_address_wrong_object_id(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:read",),
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_get_own_profile_address_no_object_id(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:read",),
            kwargs={"object_id": ""},
        )

        self.assertEqual(response.status_code, 404)

    def test_get_own_profile_address_not_users_address_object_id(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        another_new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        another_new_user = another_new_user.addresses.first()

        kwargs = {"object_id": another_new_user.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:read",),
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_get_own_profile_address_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("unknow:oidc",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_own_profile_address(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=False
        )
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
                "line_2": "Lu Dinx Xio",
                "city": "Benjin",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=data,
            kwargs=kwargs,
        )
        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(patch_data.get("line_1"), json.loads(data).get("line_1"))
        self.assertEqual(patch_data.get("line_2"), json.loads(data).get("line_2"))
        self.assertEqual(patch_data.get("city"), json.loads(data).get("city"))

    def test_update_own_profile_address_on_validated(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=True
        )
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
                "line_2": "Lu Dinx Xio",
                "city": "Benjin",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=data,
            kwargs=kwargs,
        )
        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(patch_data, ["Editing validated entity is prohibited."])

    def test_update_own_profile_address_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=False
        )
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:read",),
            data=data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_own_profile_address_wrong_object_id(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=False
        )
        another_new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=False
        )
        another_new_user_address = another_new_user.addresses.first()

        kwargs = {"object_id": another_new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 404)

    def test_update_own_profile_address_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=False
        )
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
                "line_2": "910long 11hao 2303shi",
                "city": "PuDongXin",
                "post_code": "200120",
                "region": "Shanghai",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 405)

    def test_delete_own_profile_address(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=True, address__is_primary=False
        )
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 204)

    def test_delete_own_profile_address_is_primary(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=True
        )
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            kwargs=kwargs,
        )

        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(patch_data.get("non_field_errors"), ["You can NOT remove primary object"])

    def test_delete_own_profile_address_already_deleted(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, address__is_verified=True, address__is_deleted=True
        )
        new_user_address = new_user.addresses.first()

        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 404)
