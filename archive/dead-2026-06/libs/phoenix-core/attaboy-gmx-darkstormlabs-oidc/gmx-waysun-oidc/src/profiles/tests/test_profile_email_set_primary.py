import logging
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.profile import EmailSetIsPrimaryAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileEmailSetPrimaryApiView(AbstractCommonTest):
    target_url_name = "profiles:email_set_primary"
    target_view_class = EmailSetIsPrimaryAPIView

    def test_set_primary_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, email__is_primary=False, email__is_verified=True
        )
        new_user_email = new_user.emails.first()
        kwargs = {"object_id": new_user_email.object_id}
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
            permissions_required=("oidc:email:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("is_primary"), json.loads(update_data).get("is_primary"))
        self.assertEqual(data.get("email"), new_user_email.email)
        self.assertEqual(data.get("is_verified"), new_user_email.is_verified)

    def test_set_primary_email_on_not_validated(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, email__is_primary=False, email__is_verified=False
        )
        new_user_email = new_user.emails.first()
        kwargs = {"object_id": new_user_email.object_id}
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
            permissions_required=("oidc:email:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(data, ["Setting 'is_primary' on none validated entity is prohibited."])

    def test_set_primary_email_on_not_my_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, email__is_primary=False, email__is_verified=True
        )
        another_new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, email__is_primary=False, email__is_verified=True
        )
        another_new_user_email = another_new_user.emails.first()
        kwargs = {"object_id": another_new_user_email.object_id}
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
            permissions_required=("oidc:email:write",),
            data=update_data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 404)

    def test_set_primary_email_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, email__is_primary=False, email__is_verified=True
        )
        new_user_email = new_user.emails.first()
        kwargs = {"object_id": new_user_email.object_id}
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
            permissions_required=("oidc:email:read",),
            data=update_data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_set_primary_email_no_kwargs(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, email__is_primary=False, email__is_verified=True
        )
        new_user_email = new_user.emails.first()
        kwargs = {"object_id": new_user_email.object_id}
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
            permissions_required=("oidc:email:write",),
            data=update_data,
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_set_primary_email_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, email__is_primary=False, email__is_verified=True
        )
        new_user_email = new_user.emails.first()
        kwargs = {"object_id": new_user_email.object_id}
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
            permissions_required=("oidc:email:write",),
            data=update_data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 405)
