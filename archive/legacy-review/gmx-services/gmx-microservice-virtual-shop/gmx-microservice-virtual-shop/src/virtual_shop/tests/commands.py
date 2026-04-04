from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase


class ProvisionUsersTestCase(TestCase):
    def test_simple_provision(self):
        call_command("provision_users")
        self.assertTrue(User.objects.filter(username="flipadmin").exists())
        self.assertTrue(User.objects.filter(username="flipadmin").first().is_superuser)
        self.assertTrue(User.objects.filter(username="flipadmin").first().is_staff)
