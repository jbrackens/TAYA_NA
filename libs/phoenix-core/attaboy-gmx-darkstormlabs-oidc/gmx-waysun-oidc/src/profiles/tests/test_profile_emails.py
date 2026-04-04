import logging

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.profile import EmailListAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileEmailsListCreateAPIView(AbstractCommonTest):
    target_url_name = "profiles:email_list"
    target_view_class = EmailListAPIView

    def test_get_own_profile_emails(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_email = new_user.emails.first()
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:read",),
        )

        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(data[0].get("object_id"))
        self.assertEqual(data[0].get("email"), new_user_email.email)
        self.assertEqual(data[0].get("is_primary"), new_user_email.is_primary)
        self.assertEqual(data[0].get("is_verified"), new_user_email.is_verified)
        self.assertEqual(
            len(data), models.Email.objects.filter(user=new_user, user__originator=user.originator).count()
        )

    def test_get_own_profile_emails_more_than_one(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)

        user_company = new_user.get_originator_company()
        user_company.max_emails = 2
        user_company.save()

        factory_user.EmailBaseSchemaFactory.create(user=new_user)
        new_user_email = new_user.emails.first()
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:read",),
        )

        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(data[0].get("object_id"))
        self.assertEqual(data[0].get("email"), new_user_email.email)
        self.assertEqual(data[0].get("is_primary"), new_user_email.is_primary)
        self.assertEqual(data[0].get("is_verified"), new_user_email.is_verified)
        self.assertEqual(
            len(data), models.Email.objects.filter(user=new_user, user__originator=user.originator).count()
        )

    def test_get_own_profile_emails_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("unknown_oidc",),
        )

        self.assertEqual(response.status_code, 403)

    def test_create_own_profile_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutEmail.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "email": "test@test.com",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(post_data.get("object_id"))
        self.assertEqual(post_data.get("email"), json.loads(data).get("email"))
        self.assertEqual(post_data.get("is_primary"), False)
        self.assertEqual(post_data.get("is_verified"), False)
        self.assertEqual(models.Email.objects.filter(user=new_user).count(), 1)

    def test_create_own_profile_email_illegal_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutEmail.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"email": "test@test.com", "is_primary": True, "is_verified": True})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(post_data.get("object_id"))
        self.assertEqual(post_data.get("email"), json.loads(data).get("email"))
        self.assertEqual(post_data.get("is_primary"), False)
        self.assertEqual(post_data.get("is_verified"), False)
        self.assertEqual(models.Email.objects.filter(user=new_user).count(), 1)

    def test_create_own_profile_email_no_required_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutEmail.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"is_primary": True, "is_verified": True})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("email"), ["This field is required."])

    def test_create_own_profile_email_too_many_emails(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "email": "test@test.com",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data, ["too many emails"])

    def test_create_own_profile_email_already_existing(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutEmail.create(originator=user.originator)
        another_new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        another_new_user_email = another_new_user.emails.first()
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "email": another_new_user_email.email,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("email"), ["email with this email already exists."])
        self.assertEqual(models.Email.objects.filter(user=new_user).count(), 0)

    def test_create_own_profile_email_wrong_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutEmail.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "email": "ThisIsNotValidEmail",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("email"), ["Enter a valid email address."])
        self.assertEqual(models.Email.objects.filter(user=new_user).count(), 0)

    def test_create_own_profile_email_already_deleted(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, email__is_deleted=True
        )
        new_user_email = new_user.emails.first()
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "email": new_user_email.email,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data, ["email with this email already exists."])
        self.assertEqual(models.Email.objects.filter(user=new_user).count(), 0)

    def test_create_own_profile_email_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutEmail.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "email": "test@test.com",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:uknown",),
            data=data,
        )

        self.assertEqual(response.status_code, 403)

    def test_create_own_profile_address_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutEmail.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "email": "test@test.com",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:email:write",),
            data=data,
        )

        self.assertEqual(response.status_code, 405)
