from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from oidc_provider.models import Client

from oidc import models
from oidc.tests import factory
from oidc.utils import PERMISSIONS_LIST
from profiles import models as profile_models


class Command(BaseCommand):
    except_permissions = (
        'oidc:api_keys:read',
        'wallet:transaction_keys:read',
        'wallet:transaction_keys:recreate:read',
        'wallet:ext_order:read',
        'wallet:line:write',
        'wallet:line:bpr:write'
        'tna:ads:write',
        'private_wallet:product:write',
        'private_wallet:products:write',
        'private_wallet:wallet:exchange:write',
        'private_wallet:wallet:lines:write',
        'private_wallet:purchases:for_user:write'
    )

    def _get_user_for_username(self, username):
        user = profile_models.CustomUser.objects.filter(username=username).first()
        if user is None:
            raise CommandError('Make sure that Users has been provisioned! Execute "provision_users" before this command!')
        return user

    def _get_permission(self, permission):
        perm = models.PermissionNode.objects.filter(name__iexact=permission).first()
        if perm is None:
            raise CommandError('Make sure that Permissions has been provisioned! Execute "provision_permissions" before this command!')
        return perm

    def _get_oidc_client(self, name, user, client_id):
        client = models.OidcClientExtra.objects.filter(oidc_client__name__exact=name).first()
        if not client:
            temp = Client.objects.filter(name__exact=name).first()
            if temp is None:
                temp = factory.OidcClientFactory(
                    name=name,
                    client_type='public',
                    client_id=client_id,
                    response_type='id_token token',
                    reuse_consent=True,
                    require_consent=False,
                )
            client = factory.OidcClientExtraFactory(
                oidc_client=temp,
                user=user
            )
        return client

    def handle(self, *args, **options):
        rmx_user = self._get_user_for_username(username=settings.REWARD_MATRIX_USER)
        admin_user = self._get_user_for_username(username=settings.REWARD_MATRIX_FULL_ACCESS_USER)

        all_permissions = []
        default_permissions = []
        limited_permissions = []

        for perm_name, _ in PERMISSIONS_LIST:
            perm_node = self._get_permission(perm_name)
            all_permissions.append(perm_node)
            if perm_name not in self.except_permissions:
                default_permissions.append(perm_node)
                if perm_name.startswith('oidc') and perm_name.endswith('read'):
                    limited_permissions.append(perm_node)

        client = self._get_oidc_client(settings.OIDC_RMX_GUI_CLIENT_NAME, rmx_user, settings.OIDC_RMX_GUI_CLIENT_ID)

        client.default_permissions.set(default_permissions)
        client.limited_permissions.set(limited_permissions)
        admin_user.oidc_permissions.set(all_permissions)
