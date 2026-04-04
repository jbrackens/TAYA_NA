from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from oidc_provider.models import Client, ResponseType

from oidc import models
from oidc.token_tools import PERMISSIONS_LIST
from profiles import models as profile_models


# noinspection PyMethodMayBeStatic
class Command(BaseCommand):
    except_permissions = {permission for permission, _ in PERMISSIONS_LIST if ":admin:" in permission}

    def _get_user_for_username(self, username):
        user = profile_models.CustomUser.objects.filter(username=username).first()
        if user is None:
            raise CommandError(
                'Make sure that Users has been provisioned! Execute "provision_users" before this command!'
            )
        return user

    def _get_permission(self, permission):
        perm = models.OidcPermissions.objects.filter(name__iexact=permission).first()
        if perm is None:
            raise CommandError(
                'Make sure that Permissions has been provisioned! Execute "provision_permissions" before this command!'
            )
        return perm

    def _get_oidc_client(self, name, user, client_id, client_secret):
        client = models.OidcClientExtra.objects.filter(oidc_client__client_id__exact=client_id).first()
        if not client:
            response_type, created = ResponseType.objects.get_or_create(
                value="id_token token", defaults={"description": "id_token token (Implicit Flow)"}
            )
            if created:
                self.stdout.write(f"Created {response_type}")
            temp = Client.objects.filter(client_id__exact=client_id).first()
            if temp is None:
                temp = Client(
                    name=name,
                    client_type="public",
                    client_id=client_id,
                    client_secret=client_secret,
                    reuse_consent=True,
                    require_consent=False,
                )
                temp.save()
                temp.response_types.set([response_type])
                temp.save()
                self.stdout.write(f"Created {temp}")
            client = models.OidcClientExtra(oidc_client=temp, user=user)
            client.save()
            self.stdout.write(f"Created {client}")
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
                if perm_name.startswith("oidc") and perm_name.endswith("read"):
                    limited_permissions.append(perm_node)

        client = self._get_oidc_client(
            name=settings.OIDC_RMX_GUI_CLIENT_NAME,
            user=rmx_user,
            client_id=settings.OIDC_RMX_GUI_CLIENT_ID,
            client_secret=settings.OIDC_RMX_GUI_CLIENT_PASS,
        )

        client.default_permissions_set.set(default_permissions)
        self.stdout.write(f"updated default permissions for {client}")
        client.limited_permissions_set.set(limited_permissions)
        self.stdout.write(f"updated limited permissions for {client}")
        admin_user.oidc_default_permissions_set.set(all_permissions)
        self.stdout.write(f"updated default permissions for {admin_user}")
