import logging
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.admin_profile import EmailSetVerifiedAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileEmailSetVerifiedApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:email_set_verified"
    target_view_class = EmailSetVerifiedAPIView

    def test_set_verified_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(
            originator=user.originator, email__is_primary=False, email__is_verified=False
        )
        new_user_email_object_id = models.Email.objects.get(user=new_user).object_id
        kwargs = {"object_id": new_user_email_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_verified": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:email:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data.get("is_verified"), json.loads(update_data).get("is_verified"))

    def test_set_already_verified_email(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email_object_id = new_user.emails.get(email=new_user.email).object_id
        kwargs = {"object_id": new_user_email_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_verified": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:email:write",),
            data=update_data,
            kwargs=kwargs,
        )
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data, ["Editing validated entity is prohibited."])

    def test_set_verified_email_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email_object_id = new_user.emails.get(email=new_user.email).object_id
        kwargs = {"object_id": new_user_email_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_verified": True,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:email:read",),
            data=update_data,
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_update_users_no_kwargs(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email_object_id = new_user.emails.get(email=new_user.email).object_id
        kwargs = {"object_id": new_user_email_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:email:write",),
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_update_own_user_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_email_object_id = new_user.emails.get(email=new_user.email).object_id
        kwargs = {"object_id": new_user_email_object_id}
        target_url = self.get_target_url(kwargs=kwargs)

        update_data = json.dumps(
            {
                "is_verified": True,
            }
        )

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:email:write",),
            data=update_data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 405)
