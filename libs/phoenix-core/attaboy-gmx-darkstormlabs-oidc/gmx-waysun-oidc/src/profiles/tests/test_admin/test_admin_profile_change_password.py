import logging

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.admin_profile import ChangePasswordByAdminApiView

logger = logging.getLogger(__name__)


class TestCustomProfileChangePasswordApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:admin_password_change"
    target_view_class = ChangePasswordByAdminApiView

    def test_change_account_password(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email = new_user.emails.get(email=new_user.email).email
        target_url = self.get_target_url()

        data = json.dumps({"login_type": "email", "login": new_user_email, "new_password": "Sup3S3cretP4$$w0rd"})
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 201)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("sub"), new_user.sub)

    def test_change_account_password_none_existing_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {"login_type": "email", "login": "none_existing@email.com", "new_password": "Sup3S3cretP4$$w0rd"}
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("login"), ["user not found"])

    def test_change_account_password_wrong_login_type(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email = new_user.emails.get(email=new_user.email).email
        target_url = self.get_target_url()

        data = json.dumps({"login_type": "username", "login": new_user_email, "new_password": "Sup3S3cretP4$$w0rd"})

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("login"), ["user not found"])

    def test_change_account_password_too_short(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email = new_user.emails.get(email=new_user.email).email
        target_url = self.get_target_url()

        data = json.dumps({"login_type": "username", "login": new_user_email, "new_password": "12ddfF$"})
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(
            post_data.get("new_password"), ["['This password is too short. It must contain at least 8 characters.']"]
        )

    def test_change_account_password_missing_new_pass(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email = new_user.emails.get(email=new_user.email).email
        target_url = self.get_target_url()

        data = json.dumps({"login_type": "username", "login": new_user_email})
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("new_password"), ["This field is required."])

    def test_change_account_password_missing_login_type(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email = new_user.emails.get(email=new_user.email).email
        target_url = self.get_target_url()

        data = json.dumps({"login": new_user_email, "new_password": "Sup3S3cretP4$$w0rd"})
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("login_type"), ["This field is required."])

    def test_change_account_password_missing_login(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"login_type": "email", "new_password": "Sup3S3cretP4$$w0rd"})
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("login"), ["This field is required."])

    def test_change_account_password_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"login_type": "email", "new_password": "Sup3S3cretP4$$w0rd"})
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:read",),
            data=data,
        )

        self.assertEqual(response.status_code, 403)

    def test_create_social_account_details_no_payload(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        target_url = self.get_target_url()

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:password:write",),
        )
        self.assertEqual(response.status_code, 400)
