import logging
import random
from uuid import uuid4

import ujson as json
from django.conf import settings

from common.tests.common import AbstractCommonTest
from profiles import models
from profiles.factories import user as factory_user
from profiles.views.admin_profile import SocialAccountDetailListAPIView

logger = logging.getLogger(__name__)


class TestCustomProfileSocialsApiView(AbstractCommonTest):
    target_url_name = "admin_profiles:admin_social_list"
    target_view_class = SocialAccountDetailListAPIView

    def test_get_social_account_details(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
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
        self.assertEqual(database_socials_count, len(data))
        self.assertEqual(
            data[0].get("social_account_type"), new_user.social_accounts_set.all().first().social_account_type
        )
        self.assertEqual(data[0].get("social_account_id"), new_user.social_accounts_set.all().first().social_account_id)
        self.assertEqual(
            data[0].get("social_account_extra"), new_user.social_accounts_set.all().first().social_account_extra
        )

    def test_get_social_account_details_wrong_sub(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        kwargs = {"user_sub": f"gmx_{uuid4().hex}"}
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
        self.assertEqual(data.get("user_sub"), "unable to find user")

    def test_get_social_account_details_empty(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_without_social = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_without_social_sub = new_user_without_social.sub
        kwargs = {"user_sub": new_user_without_social_sub}
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
        self.assertEqual(data, [])

    def test_get_social_account_details_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )

        self.assertEqual(response.status_code, 403)

    def test_get_social_account_details_no_kwargs(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.get(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:read",),
            kwargs={"object_id": uuid4().hex},
        )

        self.assertEqual(response.status_code, 404)

    def test_get_social_account_details_not_safe_method(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.patch(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 405)

    def test_create_social_account_details(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_type": social_account_type,
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 201)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("social_account_type"), social_account_type)
        self.assertEqual(post_data.get("social_account_id"), social_account_id)
        self.assertEqual(post_data.get("social_account_extra"), social_account_extra)
        database_user_social_count = models.SocialAccountDetails.objects.filter(user=new_user).count()
        self.assertEqual(database_user_social_count, 1)

    def test_create_social_account_details_already_existing(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        already_existing_social_account_type = new_user.social_accounts_set.all().first().social_account_type
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_type = already_existing_social_account_type
        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_type": social_account_type,
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("non_field_errors"), "create not allowed - user has this type")
        database_user_social_count = models.SocialAccountDetails.objects.filter(user=new_user).count()
        self.assertEqual(database_user_social_count, 1)

    def test_create_two_social_account_details(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactoryWithSocial.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        already_existing_social_account_type = new_user.social_accounts_set.all().first().social_account_type
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_type = random.choice(
            [
                x
                for x in models.SocialAccountDetails.SocialTypeChoices.to_choices()
                if x[0] != already_existing_social_account_type
            ]
        )[0]
        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_type": social_account_type,
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 201)
        database_user_social_count = models.SocialAccountDetails.objects.filter(user=new_user).count()
        self.assertEqual(database_user_social_count, 2)

    def test_create_social_account_details_wrong_sub(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_type": social_account_type,
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs={"user_sub": uuid4().hex},
        )
        self.assertEqual(response.status_code, 404)

    def test_create_social_account_details_missing_field(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps({"social_account_id": social_account_id, "social_account_extra": social_account_extra})
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs=kwargs,
        )
        post_data = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(post_data.get("social_account_type"), ["This field is required."])

    def test_create_social_account_details_wrong_filed(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[1]
        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_type": social_account_type,
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 400)
        post_data = json.loads(response.content)
        self.assertEqual(post_data.get("social_account_type"), [f'"{social_account_type}" is not a valid choice.'])

    def test_create_social_account_details_wrong_permission(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
        social_account_id = uuid4().hex
        social_account_extra = dict(line1="random_line1", line2="random_line2")

        data = json.dumps(
            {
                "social_account_type": social_account_type,
                "social_account_id": social_account_id,
                "social_account_extra": social_account_extra,
            }
        )
        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:read",),
            data=data,
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 403)

    def test_create_social_account_details_no_payload(self):
        user = models.CustomUser.objects.get_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER)
        new_user = factory_user.UserCreateSchemaFactory.create(originator=user.originator)
        new_user_user_sub = new_user.sub
        kwargs = {"user_sub": new_user_user_sub}
        target_url = self.get_target_url(kwargs=kwargs)

        response = self.api_client.post(
            target_url=target_url,
            user=user,
            oidc_client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            permissions_required=("oidc:admin:profile:social_account:write",),
            kwargs=kwargs,
        )
        self.assertEqual(response.status_code, 400)
