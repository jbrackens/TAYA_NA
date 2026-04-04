import logging
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.profile import AddressSetIsPrimaryAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileAddressSetPrimaryApiView(AbstractCommonTest):
    target_url_name = "profiles:address_set_primary"
    target_view_class = AddressSetIsPrimaryAPIView

    def test_set_primary_address(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=True
        )
        new_user_address = new_user.addresses.first()
        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_primary": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("is_primary"), json.loads(update_data).get("is_primary"))
        self.assertEqual(data.get("country"), new_user_address.country)
        self.assertEqual(data.get("line_1"), new_user_address.line_1)
        self.assertEqual(data.get("line_2"), new_user_address.line_2)
        self.assertEqual(data.get("city"), new_user_address.city)
        self.assertEqual(data.get("post_code"), new_user_address.post_code)
        self.assertEqual(data.get("region"), new_user_address.region)
        self.assertEqual(data.get("is_verified"), new_user_address.is_verified)

    def test_set_primary_address_on_not_validated(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=False
        )
        new_user_address = new_user.addresses.first()
        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_primary": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(data, ["Setting 'is_primary' on none validated entity is prohibited."])

    def test_set_primary_address_on_not_my_address(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=True
        )
        another_new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=True
        )
        another_new_user_address = another_new_user.addresses.first()
        kwargs = {"object_id": another_new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_primary": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=update_data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 404)

    def test_set_primary_address_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=True
        )
        new_user_address = new_user.addresses.first()
        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_primary": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:read",),
            data=update_data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_set_primary_address_no_kwargs(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=True
        )
        new_user_address = new_user.addresses.first()
        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_primary": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=update_data,
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_set_primary_address_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, address__is_primary=False, address__is_verified=True
        )
        new_user_address = new_user.addresses.first()
        kwargs = {"object_id": new_user_address.object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_primary": True,
            }
        )

        response = self.api_client.post(
            target_url=target_url,
            user=new_user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:address:write",),
            data=update_data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 405)
