from django.core import management
from django.test.testcases import TestCase

from oidc import models
from oidc.management.commands import provision_rmx_client
from oidc.utils import PERMISSIONS_LIST
from profiles.models import CustomUser
from django.conf import settings

class ProvisionPermissionsTestCase(TestCase):
    def setUp(self):
        """
        Method invokes `provision_permissions` command
        """
        management.call_command('provision_users', verbosity=0)
        management.call_command('provision_permissions', verbosity=0)
        management.call_command('provision_rmx_client', verbosity=0)

    def test_list_of_permissions_is_correct(self):
        for permission, description in PERMISSIONS_LIST:
            permission = permission.lower().strip()
            elements = permission.split(':')
            node = models.PermissionNode.objects.filter(name__iexact=permission, description__iexact=description).first()
            self.assertIsNotNone(node)
            elements.pop(-1)
            for group_name in elements[::-1]:
                self.assertEqual(node.parent.name.lower(), group_name)
                node = node.parent

    def test_provision_client_all_perms(self):
        admin = CustomUser.objects.get(username=settings.REWARD_MATRIX_FULL_ACCESS_USER)
        admin_perms = sorted(list(set((p.name for p in admin.oidc_permissions.all()))))
        all_perms = sorted(list(set(p[0] for p in PERMISSIONS_LIST)))

        self.assertEqual(len(admin_perms), len(all_perms))

        for p in all_perms:
            self.assertTrue(p in admin_perms)

    def test_provision_client_limited(self):
        rmx_client_extra = models.OidcClientExtra.objects.get(oidc_client__name__exact=settings.OIDC_RMX_GUI_CLIENT_NAME)
        rmx_perms = list(p.name for p in rmx_client_extra.get_limited_permissions())
        for p in rmx_perms:
            self.assertTrue(p.startswith('oidc'))
            self.assertTrue(p.endswith('read'))

    def test_provision_client_default(self):
        rmx_client_extra = models.OidcClientExtra.objects.get(oidc_client__name__exact=settings.OIDC_RMX_GUI_CLIENT_NAME)
        rmx_perms = list(p.name for p in rmx_client_extra.get_default_permissions())
        for p in provision_rmx_client.Command.except_permissions:
            self.assertFalse(p in rmx_perms)
