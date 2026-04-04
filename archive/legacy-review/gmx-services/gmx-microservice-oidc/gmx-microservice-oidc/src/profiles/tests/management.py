from django.core import management
from django.test import TestCase

from profiles import models
from django.conf import settings


class ProvisionUsersTestCase(TestCase):
    def test_provision_users(self):
        management.call_command('provision_users')
        self.assertTrue(models.CustomUser.objects.filter(username=settings.REWARD_MATRIX_USER).exists(), 'Rewards matrxi user should be created')
        self.assertEqual(models.Company.objects.count(), 1, 'OneCompany should be created')
        self.assertTrue(models.CustomUser.objects.filter(username='flipadmin').exists(), "flipadmin user should exists")
