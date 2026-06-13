import logging
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.profile import EmailRetrieveUpdateDestroyAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileEmailRUDAPIView(AbstractCommonTest):
    target_url_name = "profiles:emails_rud"
    target_view_class = EmailRetrieveUpdateDestroyAPIView

    def test_get_own_profile_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:read",),
            kwargs=kwargs,
        )

        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(data.get("object_id"))
        self.assertEqual(len(data), 4)
        self.assertEqual(data.get("email"), new_user_email.email)
        self.assertEqual(data.get("is_primary"), new_user_email.is_primary)
        self.assertEqual(data.get("is_verified"), new_user_email.is_verified)

    def test_get_own_profile_email_wrong_object_id(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:read",),
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_get_own_profile_email_no_object_id(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:read",),
            kwargs={"object_id": ""},
        )

        self.assertEqual(response.status_code, 404)

    def test_get_own_profile_email_not_users_email_object_id(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        another_new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        another_new_user_email = another_new_user.emails.first()

        kwargs = {"object_id": another_new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:read",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 404)

    def test_get_own_profile_email_wrong_permission(self):
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

    def test_update_own_profile_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=False
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "email": "thisistest@email.com",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
            kwargs=kwargs,
        )
        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(patch_data.get("email"), json.loads(data).get("email"))
        self.assertEqual(patch_data.get("is_verified"), new_user_email.is_verified)
        self.assertEqual(patch_data.get("is_primary"), new_user_email.is_primary)

    def test_update_own_profile_email_not_valid_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=False
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "email": "ThisIsNotValidEmail",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
            kwargs=kwargs,
        )
        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(patch_data.get("email"), ["Enter a valid email address."])

    def test_update_own_profile_email_illegal_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=False, email__is_primary=False
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps({"email": "thisistest@email.com", "is_verified": True, "is_primary": True})
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
            kwargs=kwargs,
        )
        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(patch_data.get("email"), json.loads(data).get("email"))
        self.assertEqual(patch_data.get("is_verified"), False)
        self.assertEqual(patch_data.get("is_primary"), False)

    def test_update_own_profile_email_on_validated(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=True
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "email": "thisistest@email.com",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
            kwargs=kwargs,
        )
        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(patch_data, ["Editing validated entity is prohibited."])

    def test_update_own_profile_email_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=False
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "email": "thisistest@email.com",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:read",),
            data=data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_own_profile_email_wrong_object_id(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=False
        )
        another_new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=False
        )
        another_new_user_email = another_new_user.emails.first()

        kwargs = {"object_id": another_new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "email": "test@email.com",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 404)

    def test_update_own_profile_email_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=False
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        data = json.dumps(
            {
                "email": "thisistest@email.com",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 405)

    def test_delete_own_profile_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=True, email__is_primary=False
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 204)

    def test_delete_own_profile_email_is_primary(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=True, email__is_primary=True
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            kwargs=kwargs,
        )

        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(patch_data.get("non_field_errors"), ["You can NOT remove primary object"])

    def test_delete_own_profile_address_already_deleted(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_verified=True, email__is_primary=False, email__is_deleted=True
        )
        new_user_email = new_user.emails.first()

        kwargs = {"object_id": new_user_email.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 404)
