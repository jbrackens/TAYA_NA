import logging

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.profile import AddressListCreateAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileAddressListCreateAPIView(AbstractCommonTest):
    target_url_name = "profiles:address_list_create"
    target_view_class = AddressListCreateAPIView

    def test_get_own_profile_addresses(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:read",),
        )

        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data[0].get("country"), new_user.addresses.first().country)
        self.assertEqual(data[0].get("line_1"), new_user.addresses.first().line_1)
        self.assertEqual(data[0].get("line_2"), new_user.addresses.first().line_2)
        self.assertEqual(data[0].get("city"), new_user.addresses.first().city)
        self.assertEqual(data[0].get("post_code"), new_user.addresses.first().post_code)
        self.assertEqual(data[0].get("region"), new_user.addresses.first().region)
        self.assertEqual(data[0].get("is_verified"), new_user.addresses.first().is_verified)
        self.assertEqual(data[0].get("is_primary"), new_user.addresses.first().is_primary)
        self.assertEqual(
            len(data), models.Address.objects.filter(user=new_user, user__originator=user.originator).count()
        )

    def test_get_own_profile_addresses_more_than_one(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        factory_user.AddressBaseSchemaFactory.create(user=new_user)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:read",),
        )

        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data[0].get("country"), new_user.addresses.first().country)
        self.assertEqual(data[0].get("line_1"), new_user.addresses.first().line_1)
        self.assertEqual(data[0].get("line_2"), new_user.addresses.first().line_2)
        self.assertEqual(data[0].get("city"), new_user.addresses.first().city)
        self.assertEqual(data[0].get("post_code"), new_user.addresses.first().post_code)
        self.assertEqual(data[0].get("region"), new_user.addresses.first().region)
        self.assertEqual(data[0].get("is_verified"), new_user.addresses.first().is_verified)
        self.assertEqual(data[0].get("is_primary"), new_user.addresses.first().is_primary)
        self.assertEqual(
            len(data), models.Address.objects.filter(user=new_user, user__originator=user.originator).count()
        )

    def test_get_own_profile_addresses_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        target_url = self.get_target_url()

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("unknown_oidc",),
        )

        self.assertEqual(response.status_code, 403)

    def test_create_own_profile_address(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutAddress.create(originator=user.originator)
        target_url = self.get_target_url()

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
        )
        post_data = json.loads(response.content)
        new_address = new_user.addresses.first()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(post_data.get("country"), new_address.country)
        self.assertEqual(post_data.get("line_1"), new_address.line_1)
        self.assertEqual(post_data.get("line_2"), new_address.line_2)
        self.assertEqual(post_data.get("city"), new_address.city)
        self.assertEqual(post_data.get("post_code"), new_address.post_code)
        self.assertEqual(post_data.get("region"), new_address.region)
        self.assertEqual(post_data.get("is_verified"), False)
        self.assertEqual(post_data.get("is_primary"), False)
        self.assertEqual(models.Address.objects.filter(user=new_user).count(), 1)

    def test_create_own_profile_address_illegal_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutAddress.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
                "line_2": "910long 11hao 2303shi",
                "city": "PuDongXin",
                "post_code": "200120",
                "region": "Shanghai",
                "is_verified": True,
                "is_primary": True,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        new_address = new_user.addresses.first()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(post_data.get("country"), new_address.country)
        self.assertEqual(post_data.get("line_1"), new_address.line_1)
        self.assertEqual(post_data.get("line_2"), new_address.line_2)
        self.assertEqual(post_data.get("city"), new_address.city)
        self.assertEqual(post_data.get("post_code"), new_address.post_code)
        self.assertEqual(post_data.get("region"), new_address.region)
        self.assertEqual(post_data.get("is_verified"), False)
        self.assertEqual(post_data.get("is_primary"), False)

    def test_create_own_profile_address_no_required_fields(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutAddress.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "line_2": "910long 11hao 2303shi",
                "region": "Shanghai",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("line_1"), ["This field is required."])
        self.assertEqual(post_data.get("city"), ["This field is required."])
        self.assertEqual(post_data.get("post_code"), ["This field is required."])

    def test_create_own_profile_address_too_many_addresses(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutAddress.create(originator=user.originator)
        factory_user.AddressBaseSchemaFactory.create(user=new_user)
        target_url = self.get_target_url()

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
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data, ["too many addresses"])

    def test_create_own_profile_address_wrong_country(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutAddress.create(originator=user.originator)
        target_url = self.get_target_url()
        wrong_country = "WrongCountry"

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
                "line_2": "910long 11hao 2303shi",
                "country": wrong_country,
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
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("country"), [f'"{wrong_country}" is not a valid choice.'])

    def test_create_own_profile_address_wrong_post_code(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutAddress.create(originator=user.originator)
        target_url = self.get_target_url()
        wrong_post_code = "WrongPostCode"

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
                "line_2": "910long 11hao 2303shi",
                "city": "PuDongXin",
                "post_code": wrong_post_code,
                "region": "Shanghai",
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=data,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("post_code"), ["Ensure this field has no more than 10 characters."])

    def test_create_own_profile_address_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutAddress.create(originator=user.originator)
        target_url = self.get_target_url()

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
            permissions_required=("oidc:address:read",),
            data=data,
        )

        self.assertEqual(response.status_code, 403)

    def test_create_own_profile_address_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithoutAddress.create(originator=user.originator)
        target_url = self.get_target_url()

        data = json.dumps(
            {
                "line_1": "Ding Xiang Lu",
                "line_2": "910long 11hao 2303shi",
                "city": "PuDongXin",
                "post_code": "200120",
                "region": "Shanghai",
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=data,
        )

        self.assertEqual(response.status_code, 405)
