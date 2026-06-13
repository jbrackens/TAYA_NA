import logging
import random
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.admin_profile import SocialAccountDetailRUDAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileSocialsRUDApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:admin_social_rud"
    target_view_class = SocialAccountDetailRUDAPIView

    def test_get_social_account_details_rud(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:read",),
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 200)

        data = json.loads(response.content)
        database_socials_count = models.SocialAccountDetails.objects.filter(
            user__originator__company__sub=user.originator.company.sub
        ).count()
        self.assertEqual(database_socials_count, 1)
        self.assertEqual(
            data.get("social_account_type"), new_user.social_accounts_set.all().first().social_account_type
        )
        self.assertEqual(data.get("social_account_id"), new_user.social_accounts_set.all().first().social_account_id)
        self.assertEqual(
            data.get("social_account_extra"), new_user.social_accounts_set.all().first().social_account_extra
        )

    def test_get_social_account_details_rud_wrong_sub(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        kwargs = {"user_sub": f"gmx_{uuid4().hex}", "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:read",),
            kwargs=kwargs,
        )
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(data.get("detail"), "Not found.")

    def test_get_social_account_details_rud_wrong_type(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        not_existing_social_account_type = random.choice(
            [x for x in models.SocialAccountDetails.SocialTypeChoices.to_choices() if x[0] != social_account_type]
        )[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        kwargs = {"user_sub": new_user.sub, "social_account_type": not_existing_social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:read",),
            kwargs=kwargs,
        )
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(data.get("detail"), "Not found.")

    def test_get_social_account_details_rud_wrong_permission(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        kwargs = {"user_sub": new_user.sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_get_social_account_details_rud_no_kwargs(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        kwargs = {"user_sub": new_user.sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:read",),
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_get_social_account_details_rud_not_safe_method(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        kwargs = {"user_sub": new_user.sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 405)

    def test_update_social_account_details_rud(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        kwargs = {"user_sub": new_user.sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 200)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("social_account_type"), social_account_type)
        self.assertEqual(post_data.get("social_account_id"), social_account_id)
        self.assertEqual(post_data.get("social_account_extra"), social_account_extra)
        database_user_social_count = models.SocialAccountDetails.objects.filter(user=new_user).count()
        self.assertEqual(database_user_social_count, 1)

    def test_update_social_account_details_rud_wrong_sub(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs={"user_sub": uuid4().hex, "social_account_type": social_account_type},
        )
        self.assertEqual(response.status_code, 404)

    def test_update_social_account_details_rud_wrong_type(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        not_existing_social_account_type = random.choice(
            [x for x in models.SocialAccountDetails.SocialTypeChoices.to_choices() if x[0] != social_account_type]
        )[0]
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub, "social_account_type": not_existing_social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 404)

    def test_update_social_account_details_rud_illegal_field(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        not_existing_social_account_type = random.choice(
            [x for x in models.SocialAccountDetails.SocialTypeChoices.to_choices() if x[0] != social_account_type]
        )[0]
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        new_social_account_type = not_existing_social_account_type
        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "new_social_account_type": new_social_account_type,
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs=kwargs,
        )
        patch_data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(patch_data.get("social_account_type"), social_account_type)
        self.assertEqual(patch_data.get("social_account_id"), social_account_id)
        self.assertEqual(patch_data.get("social_account_extra"), social_account_extra)
        database_user_social_count = models.SocialAccountDetails.objects.filter(user=new_user).count()
        self.assertEqual(database_user_social_count, 1)

    def test_update_social_account_details_rud_wrong_permission(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:read",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 403)

    def test_delete_social_account_details_rud(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        kwargs = {"user_sub": new_user.sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 204)

    def test_delete_social_account_details_rud_wrong_sub(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs={"user_sub": uuid4().hex, "social_account_type": social_account_type},
        )
        self.assertEqual(response.status_code, 404)

    def test_delete_social_account_details_rud_wrong_type(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        not_existing_social_account_type = random.choice(
            [x for x in models.SocialAccountDetails.SocialTypeChoices.to_choices() if x[0] != social_account_type]
        )[0]
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub, "social_account_type": not_existing_social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 404)

    def test_delete_social_account_details_rud_wrong_permission(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:read",),
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 403)

    def test_delete_social_account_details_rud_already_deleted(self):
        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(
            originator=user.originator, social_accounts_set__social_account_type=social_account_type
        )
        kwargs = {"user_sub": new_user.sub, "social_account_type": social_account_type}
        target_url = self.get_target_url(kwargs=kwargs)

        self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )

        response = self.api_client.delete(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 404)
