import logging

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.profile import PhoneListCreateAPIView

logger = logging.getLogger(__name__)


class TestCustomProfilePhoneNumbersListCreateAPIView(AbstractCommonTest):
    target_url_name = "profiles:phone_list_create"
    target_view_class = PhoneListCreateAPIView

    def test_get_own_profile_phone_numbers(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_phone = new_user.phone_numbers.first()
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:read",),
        )

        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(data[0].get("object_id"))
        self.assertEqual(data[0].get("phone_number"), new_user_phone.phone_number)
        self.assertEqual(data[0].get("is_primary"), new_user_phone.is_primary)
        self.assertEqual(data[0].get("is_verified"), new_user_phone.is_verified)
        self.assertEqual(
            len(data), models.Phone.objects.filter(user=new_user, user__originator=user.originator).count()
        )

    def test_get_own_profile_phone_numbers_more_than_one(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)

        user_company = new_user.get_originator_company()
        user_company.max_phone_numbers = 2
        user_company.save()

        factory_user.PhoneNumberBaseSchemaFactory.create(user=new_user)
        new_user_phone = new_user.phone_numbers.first()
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:read",),
        )

        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(data[0].get("object_id"))
        self.assertEqual(data[0].get("phone_number"), new_user_phone.phone_number)
        self.assertEqual(data[0].get("is_primary"), new_user_phone.is_primary)
        self.assertEqual(data[0].get("is_verified"), new_user_phone.is_verified)
        self.assertEqual(
            len(data), models.Phone.objects.filter(user=new_user, user__originator=user.originator).count()
        )

    def test_get_own_profile_phone_numbers_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
        )

        self.assertEqual(response.status_code, 403)

    def test_create_own_profile_phone_number(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutPhone.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"phone_number": "+13073311888"})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(post_data.get("object_id"))
        self.assertEqual(post_data.get("phone_number"), json.loads(data).get("phone_number"))
        self.assertEqual(post_data.get("is_primary"), False)
        self.assertEqual(post_data.get("is_verified"), False)
        self.assertEqual(models.Phone.objects.filter(user=new_user).count(), 1)

    def test_create_own_profile_phone_number_illegal_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutPhone.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"phone_number": "+13073311888", "is_primary": True, "is_verified": True})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(post_data.get("object_id"))
        self.assertEqual(post_data.get("phone_number"), json.loads(data).get("phone_number"))
        self.assertEqual(post_data.get("is_primary"), False)
        self.assertEqual(post_data.get("is_verified"), False)
        self.assertEqual(models.Phone.objects.filter(user=new_user).count(), 1)

    def test_create_own_profile_phone_number_no_required_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutPhone.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"is_primary": True, "is_verified": True})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("phone_number"), ["This field is required."])

    def test_create_own_profile_phone_number_too_many_phone_numbers(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"phone_number": "+13073311888"})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data, ["too many phone numbers"])

    def test_create_own_profile_phone_number_already_existing(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutPhone.create(originator=user.originator)
        another_new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        another_new_user_phone_number = another_new_user.phone_numbers.first()
        target_url = self.get_target_url()

        data = json.dumps({"phone_number": str(another_new_user_phone_number.phone_number)})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("phone_number"), ["phone with this phone number already exists."])
        self.assertEqual(models.Phone.objects.filter(user=new_user).count(), 0)

    def test_create_own_profile_phone_number_wrong_phone_number(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutPhone.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"phone_number": "NotValidPhoneNumber"})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("phone_number"), ["The phone number entered is not valid."])
        self.assertEqual(models.Phone.objects.filter(user=new_user).count(), 0)

    def test_create_own_profile_phone_number_already_deleted(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, phone_number__is_deleted=True
        )
        new_user_phone_number = new_user.phone_numbers.first()
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "phone_number": str(new_user_phone_number.phone_number),
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data, ["phone_number with this phone number already exists."])
        self.assertEqual(models.Phone.objects.filter(user=new_user).count(), 0)

    def test_create_own_profile_phone_number_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutPhone.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"phone_number": "+13073311888"})
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:uknown",),
            data=data,
        )

        self.assertEqual(response.status_code, 403)

    def test_create_own_profile_phone_number_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutPhone.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps({"phone_number": "+13073311888"})
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:phone_number:write",),
            data=data,
        )

        self.assertEqual(response.status_code, 405)
