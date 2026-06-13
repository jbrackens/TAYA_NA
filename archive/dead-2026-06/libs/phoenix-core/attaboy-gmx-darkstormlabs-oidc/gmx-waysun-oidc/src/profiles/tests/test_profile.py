import logging
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.profile import ProfileRetrieveUpdateAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileCreateListApiView(AbstractCommonTest):
    target_url_name = "profiles:profile_rud"
    target_view_class = ProfileRetrieveUpdateAPIView

    def test_get_own_profile(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:profile:read",),
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(len(data), 19)
        self.assertFalse(data.get("password"))
        self.assertEqual(data.get("sub"), new_user.sub)
        self.assertEqual(data.get("username"), new_user.username)
        self.assertEqual(data.get("email"), new_user.email)
        self.assertEqual(data.get("phone_number"), new_user.phone_number)
        self.assertEqual(data.get("date_of_birth"), new_user.date_of_birth)
        self.assertEqual(data.get("is_limited"), new_user.is_limited)
        self.assertEqual(data.get("is_limited"), new_user.is_limited)
        self.assertEqual(data.get("display_name"), new_user.display_name)
        self.assertEqual(data.get("first_name"), new_user.first_name)
        self.assertEqual(data.get("middle_name"), new_user.middle_name)
        self.assertEqual(data.get("last_name"), new_user.last_name)
        self.assertEqual(data.get("gender"), new_user.gender)
        self.assertEqual(data.get("timezone"), new_user.timezone)
        self.assertEqual(data.get("date_of_birth_verified"), new_user.date_of_birth_verified)
        self.assertEqual(data.get("originator").get("sub"), str(new_user.originator.company.sub))
        self.assertEqual(data.get("originator").get("name1"), new_user.originator.company.name1)
        self.assertEqual(data.get("originator").get("name2"), new_user.originator.company.name2)
        self.assertEqual(data.get("company"), None)
        self.assertEqual(data.get("addresses")[0].get("country"), new_user.addresses.first().country)
        self.assertEqual(data.get("addresses")[0].get("line_1"), new_user.addresses.first().line_1)
        self.assertEqual(data.get("addresses")[0].get("line_2"), new_user.addresses.first().line_2)
        self.assertEqual(data.get("addresses")[0].get("city"), new_user.addresses.first().city)
        self.assertEqual(data.get("addresses")[0].get("post_code"), new_user.addresses.first().post_code)
        self.assertEqual(data.get("addresses")[0].get("is_verified"), new_user.addresses.first().is_verified)
        self.assertEqual(data.get("addresses")[0].get("is_primary"), new_user.addresses.first().is_primary)
        self.assertEqual(data.get("emails")[0].get("email"), new_user.emails.first().email)
        self.assertEqual(data.get("emails")[0].get("is_primary"), new_user.emails.first().is_primary)
        self.assertEqual(data.get("emails")[0].get("is_verified"), new_user.emails.first().is_verified)
        self.assertEqual(len(data.get("emails")[0]), 4)
        self.assertEqual(data.get("phone_numbers")[0].get("phone_number"), new_user.phone_numbers.first().phone_number)
        self.assertEqual(data.get("phone_numbers")[0].get("is_verified"), new_user.phone_numbers.first().is_verified)
        self.assertEqual(data.get("phone_numbers")[0].get("is_primary"), new_user.phone_numbers.first().is_primary)
        self.assertEqual(len(data.get("phone_numbers")[0]), 4)

    def test_get_own_profile_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("unknown_oidc",),
        )

        self.assertEqual(response.status_code, 403)

    def test_update_own_profile(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "date_of_birth": "2020-11-27",
                "display_name": "NewDisplayName",
                "first_name": "NewFirstName",
                "middle_name": "NewMiddleName",
                "last_name": "NewLastName",
                "gender": "M",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:profile:write",),
            data=data,
        )
        self.assertEqual(response.status_code, 200)
        patch_data = json.loads(response.content)
        self.assertIsNone(patch_data.get("password"))
        self.assertIsNone(patch_data.get("company"))
        self.assertEqual(patch_data.get("sub"), new_user.sub)
        self.assertEqual(patch_data.get("username"), new_user.username)
        self.assertEqual(patch_data.get("email"), new_user.email)
        self.assertEqual(patch_data.get("phone_number"), new_user.phone_number)
        self.assertEqual(patch_data.get("date_of_birth"), json.loads(data).get("date_of_birth"))
        self.assertEqual(patch_data.get("originator").get("name1"), new_user.originator.company.name1)
        self.assertEqual(patch_data.get("date_of_birth_verified"), False)
        self.assertEqual(patch_data.get("is_limited"), True)
        self.assertEqual(patch_data.get("display_name"), json.loads(data).get("display_name"))
        self.assertEqual(patch_data.get("middle_name"), json.loads(data).get("middle_name"))
        self.assertEqual(patch_data.get("first_name"), json.loads(data).get("first_name"))
        self.assertEqual(patch_data.get("last_name"), json.loads(data).get("last_name"))
        print(patch_data)

    def test_update_own_profile_illegal_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "sub": uuid4().hex,
                "addresses": [
                    {
                        "line_1": "string",
                        "line_2": "string",
                        "city": "string",
                        "post_code": "string",
                        "region": "string",
                        "is_primary": True,
                    }
                ],
                "emails": [{"is_primary": True, "email": "user@example.com"}],
                "phone_numbers": [{"is_primary": True, "phone_number": "+48222222222"}],
                "is_limited": False,
                "date_of_birth_verified": True,
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:profile:write",),
            data=data,
        )
        patch_data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(patch_data.get("password"))
        self.assertIsNone(patch_data.get("company"))
        self.assertEqual(patch_data.get("sub"), new_user.sub)
        self.assertNotEqual(json.loads(data).get("sub"), new_user.sub)
        self.assertEqual(patch_data.get("username"), new_user.username)
        self.assertEqual(patch_data.get("email"), new_user.email)
        self.assertEqual(patch_data.get("phone_number"), new_user.phone_number)
        self.assertEqual(patch_data.get("originator").get("name1"), new_user.originator.company.name1)
        self.assertEqual(patch_data.get("is_limited"), True)
        self.assertNotEqual(json.loads(data).get("is_limited"), True)
        self.assertEqual(patch_data.get("date_of_birth_verified"), False)
        self.assertEqual(patch_data.get("emails")[0].get("email"), new_user.emails.first().email)
        self.assertNotEqual(json.loads(data).get("emails")[0].get("email"), new_user.emails.first().email)
        self.assertEqual(
            patch_data.get("phone_numbers")[0].get("phone_number"), new_user.phone_numbers.first().phone_number
        )
        self.assertNotEqual(
            json.loads(data).get("phone_numbers")[0].get("phone_number"), new_user.phone_numbers.first().phone_number
        )
        self.assertEqual(patch_data.get("addresses")[0].get("line_1"), new_user.addresses.first().line_1)
        self.assertNotEqual(json.loads(data).get("addresses")[0].get("line_1"), new_user.addresses.first().line_1)

    def test_update_own_profile_already_verified_birth_date(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, date_of_birth_verified=True, date_of_birth="2020-11-27"
        )
        target_url = self.get_target_url()

        data = json.dumps({"date_of_birth": "1990-03-03", "date_of_birth_verified": False})
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:profile:write",),
            data=data,
        )
        patch_data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(patch_data.get("date_of_birth_verified"), True)
        self.assertEqual(patch_data.get("date_of_birth"), str(new_user.date_of_birth))
        self.assertNotEqual(json.loads(data).get("date_of_birth"), str(new_user.date_of_birth))

    def test_update_own_profile_wrong_permission(self):
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
        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:read",),
            data=data,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_own_profile_not_safe_method(self):
        target_url = self.get_target_url()
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:profile:write",),
        )

        self.assertEqual(response.status_code, 405)
