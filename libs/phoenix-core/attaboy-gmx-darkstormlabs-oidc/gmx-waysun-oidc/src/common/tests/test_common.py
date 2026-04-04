import random
from uuid import uuid4

from django.conf import settings
from django.core.cache import cache
from oidc_provider import models as provider_models

from common.tests.common import AbstractCommonTest, ProvisionRsaKeyMixing
from oidc import models as oidc_models
from oidc.token_tools import PERMISSIONS_LIST
from profiles import models


class TestCommon(AbstractCommonTest):
    def test_database_feed_up(self):
        admin_client = provider_models.Client.objects.filter(name=settings.REWARD_MATRIX_FULL_ACCESS_USER).first()
        self.assertTrue(models.CustomUser.objects.filter_by_username(settings.REWARD_MATRIX_FULL_ACCESS_USER).exists())
        self.assertTrue(models.OidcPermissions.objects.filter(name=random.choice(PERMISSIONS_LIST)[0]).exists())
        self.assertTrue(oidc_models.OidcClientExtra.objects.filter(oidc_client=admin_client).exists())

    def test_redis_fake(self):
        value = uuid4().hex
        test_value_key = f"_test_value_key_{uuid4().hex}"
        self.assertFalse("test_value_key" in cache)
        self.assertEqual(cache.locked_get_or_set(test_value_key, lambda: value), value)
        self.assertEqual(cache.get(test_value_key), value)
        self.assertTrue(test_value_key in cache)
        self.assertEqual(
            cache.locked_get_or_set(test_value_key, lambda: uuid4().hex), value
        )  # creator should not be invoked
        self.assertEqual(cache.get(test_value_key), value)
        cache.delete(test_value_key)
        self.assertFalse(test_value_key in cache)


class TestCommonRsa(ProvisionRsaKeyMixing):
    def test_rsa_key(self):
        self.assertTrue(provider_models.RSAKey.objects.all().exists())
