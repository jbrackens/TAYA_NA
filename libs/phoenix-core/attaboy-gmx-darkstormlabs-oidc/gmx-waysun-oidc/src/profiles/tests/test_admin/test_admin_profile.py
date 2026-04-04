import logging

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.views.admin_profile import CustomProfileCreateListApiView

logger = logging.getLogger(__name__)


class TestAdminCustomProfileCreateListApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:admin_profile_list"
    target_view_class = CustomProfileCreateListApiView

    def test_get_own_users(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:read",),
        )

        self.assertEqual(response.status_code, 200)
        data: list = json.loads(response.content)
        database_users_count = models.CustomUser.objects.filter(
            originator__company__sub=user.originator.company.sub
        ).count()
        self.assertEqual(database_users_count, len(data))
        admin_users = list(filter(lambda x: x.get("username") == settings.REWARD_MATRIX_FULL_ACCESS_USER, data))
        self.assertEqual(
            len(admin_users),
            1,
            f"found {len(admin_users)} in te response with username={settings.REWARD_MATRIX_FULL_ACCESS_USER}, {admin_users}",
        )
        all_mine = list(
            map(lambda x: str(x.get("originator", dict()).get("sub")) == str(user.originator.company.sub), data)
        )
        self.assertTrue(all(all_mine), f"found not my company!")

    def test_get_own_users_wrong_permission(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("unknown_oidc",),
        )

        self.assertEqual(response.status_code, 403)

    def test_create_own_user(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        data = json.dumps(
            {
                "password": "12#$PassWrdffd",
                "is_limited": "true",
                "date_of_birth": "2020-11-16",
                "date_of_birth_verified": "true",
                "display_name": "string",
                "first_name": "string",
                "middle_name": "string",
                "last_name": "string",
                "email": "example@exampl.com",
                "phone_number": "+48 692 124 332",
                "is_active": "true",
                "is_test_user": "true",
                "is_temporary": "true",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=data,
        )

        get_response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:read",),
        )
        post_data = json.loads(response.content)
        get_data: list = json.loads(get_response.content)
        database_users_count = models.CustomUser.objects.filter(
            originator__company__sub=user.originator.company.sub
        ).count()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(database_users_count, len(get_data))
        self.assertEqual(post_data.get("originator").get("sub"), str(user.originator.company.sub))
        self.assertEqual(post_data.get("email"), json.loads(data).get("email"))
        self.assertEqual(post_data.get("phone_number"), json.loads(data).get("phone_number").replace(" ", ""))
        self.assertTrue(post_data.get("username"), not None)
        self.assertTrue(post_data.get("is_active"))
        self.assertTrue(post_data.get("date_of_birth_verified"))
        self.assertTrue(post_data.get("is_test_user"))
        self.assertTrue("password" not in post_data)

    def test_create_already_existing_user(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        data = json.dumps(
            {
                "password": "12#$PassWrdffd",
                "is_limited": "true",
                "date_of_birth": "2020-11-16",
                "date_of_birth_verified": "true",
                "username": "rest_user",
                "display_name": "string",
                "first_name": "string",
                "middle_name": "string",
                "last_name": "string",
                "is_active": "true",
                "is_test_user": "true",
                "is_temporary": "true",
            }
        )
        self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=data,
        )

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.logger.info(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("username"), ["wrong value"])
        self.assertEqual(post_data.get("display_name"), ["user with this display name already exists."])

    def test_create_own_user_with_to_many_emails(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        user_company = user.get_originator_company()
        user_company.max_emails = 0
        user_company.save()

        data = json.dumps(
            {
                "password": "12#$PassWrdffd",
                "is_limited": "true",
                "date_of_birth": "2020-11-16",
                "date_of_birth_verified": "true",
                "display_name": "string",
                "first_name": "string",
                "middle_name": "string",
                "last_name": "string",
                "email": "example@exampl.com",
                "phone_number": "+48 692 124 332",
                "is_active": "true",
                "is_test_user": "true",
                "is_temporary": "true",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=data,
        )

        post_data = json.loads(response.content)
        print(post_data)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data, ["too many emails"])

    def test_create_user_without_required_fields(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        data = json.dumps(
            {
                "password": "12#$PassWrdffd",
                "is_limited": "true",
                "date_of_birth": "2020-11-16",
                "date_of_birth_verified": "true",
                "display_name": "string",
                "first_name": "string",
                "middle_name": "string",
                "last_name": "string",
                "is_active": "true",
                "is_test_user": "true",
                "is_temporary": "true",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=data,
        )
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            data.get("non_field_errors"), ["at least one of 'email', 'phone_number', 'username' must be provided"]
        )

    def test_create_user_with_too_short_password(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        data = json.dumps(
            {
                "password": "12#",
                "username": "test_user",
                "is_limited": "true",
                "date_of_birth": "2020-11-16",
                "date_of_birth_verified": "true",
                "display_name": "string",
                "first_name": "string",
                "middle_name": "string",
                "last_name": "string",
                "is_active": "true",
                "is_test_user": "true",
                "is_temporary": "true",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=data,
        )
        data = json.loads(response.content)
        self.logger.info(data)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            data.get("password"), ["['This password is too short. It must contain at least 8 characters.']"]
        )

    def test_create_user_with_wrong_phone_number(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        data = json.dumps(
            {
                "password": "12#$PassWrdffd",
                "phone_number": "+222 222 222 222 222",
                "is_limited": "true",
                "date_of_birth": "2020-11-16",
                "date_of_birth_verified": "true",
                "display_name": "string",
                "first_name": "string",
                "middle_name": "string",
                "last_name": "string",
                "is_active": "true",
                "is_test_user": "true",
                "is_temporary": "true",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
            data=data,
        )
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual((data.get("phone_number")), ["The phone number entered is not valid."])

    def test_crete_users_wrong_permission(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        data = json.dumps(
            {
                "password": "12#$PassWrdffd",
                "phone_number": "+222 222 222 222 222",
                "is_limited": "true",
                "date_of_birth": "2020-11-16",
                "date_of_birth_verified": "true",
                "display_name": "string",
                "first_name": "string",
                "middle_name": "string",
                "last_name": "string",
                "is_active": "true",
                "is_test_user": "true",
                "is_temporary": "true",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:read",),
            data=data,
        )

        self.assertEqual(response.status_code, 403)

    def test_crete_users_no_payload(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
        )

        self.assertEqual(response.status_code, 400)

    def test_crete_users_not_safe_method(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:write",),
        )

        self.assertEqual(response.status_code, 405)
