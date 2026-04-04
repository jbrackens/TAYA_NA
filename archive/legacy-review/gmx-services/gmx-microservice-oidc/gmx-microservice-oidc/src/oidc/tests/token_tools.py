from aws_rest_default.tools import decrypt_b64
from django.test.testcases import TestCase
from django.test.utils import override_settings

from oidc import token_tools
from profiles.tests import factory as profiles_factory
from . import factory


class TokenToolsTestCase(TestCase):
    def test_sub_generator(self):
        user = profiles_factory.CustomUserFactory()
        self.assertEqual(token_tools.sub_generator(user), user.sub)

    @override_settings(JWT_EXTRA_SECRET_KEY='99acb22351869b82ed165080c6f9cc14bc795256af2e3b7d0984727e45e980c0')
    def test_token_processing_hook_originator(self):
        user = profiles_factory.CustomUserFactory()

        result = token_tools.token_processing_hook_originator({}, user)

        self.assertTrue('extra' in result)
        self.assertTrue(token_tools.JWT_ORIGINATOR_PAYLOAD_KEY in result['extra'])
        self.assertEqual(result['extra'][token_tools.JWT_ORIGINATOR_PAYLOAD_KEY], user.originator.sub)
        return result

    @override_settings(JWT_EXTRA_SECRET_KEY='99acb22351869b82ed165080c6f9cc14bc795256af2e3b7d0984727e45e980c0')
    def test_token_processing_hook_permissions(self):
        permissions = list(factory.PermissionNodeFactory() for _ in range(8))
        limited = list(factory.PermissionNodeFactory() for _ in range(2))
        user_permissions = list(factory.PermissionNodeFactory() for _ in range(4))

        user = profiles_factory.CustomUserFactory(is_limited=False, oidc_permissions=user_permissions)

        oidc_extra = factory.OidcClientExtraFactory(default_permissions=permissions, limited_permissions=limited)

        id_token = {'aud': oidc_extra.oidc_client.client_id}

        result = token_tools.token_processing_hook_permissions(id_token, user)

        self.assertTrue('extra' in result)
        self.assertTrue(token_tools.JWT_PERMISSIONS_PAYLOAD_KEY in result['extra'])
        self.assertEqual(len(result['extra'][token_tools.JWT_PERMISSIONS_PAYLOAD_KEY]), 12)
        return result

    @override_settings(JWT_EXTRA_SECRET_KEY='99acb22351869b82ed165080c6f9cc14bc795256af2e3b7d0984727e45e980c0')
    def test_token_processing_hook_permissions_limited(self):
        permissions = list(factory.PermissionNodeFactory() for _ in range(8))
        limited = list(factory.PermissionNodeFactory() for _ in range(2))
        user_permissions = list(factory.PermissionNodeFactory() for _ in range(4))

        user = profiles_factory.CustomUserFactory(is_limited=True, oidc_permissions=user_permissions)

        oidc_extra = factory.OidcClientExtraFactory(default_permissions=permissions, limited_permissions=limited)

        id_token = {'aud': oidc_extra.oidc_client.client_id}

        result = token_tools.token_processing_hook_permissions(id_token, user)

        self.assertTrue('extra' in result)
        self.assertTrue(token_tools.JWT_PERMISSIONS_PAYLOAD_KEY in result['extra'])
        self.assertEqual(len(result['extra'][token_tools.JWT_PERMISSIONS_PAYLOAD_KEY]), 6)
        return result

    @override_settings(JWT_EXTRA_SECRET_KEY='99acb22351869b82ed165080c6f9cc14bc795256af2e3b7d0984727e45e980c0')
    def test_token_processing_hook_audience_user_sub(self):
        user = profiles_factory.CustomUserFactory()
        oidc_extra = factory.OidcClientExtraFactory()
        id_token = {'aud': oidc_extra.oidc_client.client_id}

        result = token_tools.token_processing_hook_audience_user_sub(id_token, user)

        self.assertTrue('extra' in result)
        self.assertTrue(token_tools.JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY in result['extra'])
        self.assertEqual(result['extra'][token_tools.JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY], oidc_extra.user.sub)
        return result

    @override_settings(JWT_EXTRA_SECRET_KEY='99acb22351869b82ed165080c6f9cc14bc795256af2e3b7d0984727e45e980c0')
    def test_token_processing_hook_permissions_cached(self):
        permissions = list(factory.PermissionNodeFactory() for _ in range(8))
        limited = list(factory.PermissionNodeFactory() for _ in range(2))
        user_permissions = list(factory.PermissionNodeFactory() for _ in range(4))

        user = profiles_factory.CustomUserFactory(is_limited=False, oidc_permissions=user_permissions)

        oidc_extra = factory.OidcClientExtraFactory(default_permissions=permissions, limited_permissions=limited)

        id_token = {'aud': oidc_extra.oidc_client.client_id}

        result = token_tools.token_processing_hook_permissions(id_token, user)

        self.assertTrue('extra' in result)
        self.assertTrue(token_tools.JWT_PERMISSIONS_PAYLOAD_KEY in result['extra'])
        self.assertEqual(len(result['extra'][token_tools.JWT_PERMISSIONS_PAYLOAD_KEY]), 12)
        r1 = result
        r2 = token_tools.token_processing_hook_permissions(id_token, user)
        self.assertEqual(r1, r2)

    @override_settings(JWT_EXTRA_SECRET_KEY='99acb22351869b82ed165080c6f9cc14bc795256af2e3b7d0984727e45e980c0')
    def test_token_processing_hook_permissions_limited_cache(self):
        permissions = list(factory.PermissionNodeFactory() for _ in range(8))
        limited = list(factory.PermissionNodeFactory() for _ in range(2))
        user_permissions = list(factory.PermissionNodeFactory() for _ in range(4))

        user = profiles_factory.CustomUserFactory(is_limited=True, oidc_permissions=user_permissions)

        oidc_extra = factory.OidcClientExtraFactory(default_permissions=permissions, limited_permissions=limited)

        id_token = {'aud': oidc_extra.oidc_client.client_id}

        result = token_tools.token_processing_hook_permissions(id_token, user)

        self.assertTrue('extra' in result)
        self.assertTrue(token_tools.JWT_PERMISSIONS_PAYLOAD_KEY in result['extra'])
        self.assertEqual(len(result['extra'][token_tools.JWT_PERMISSIONS_PAYLOAD_KEY]), 6)
        r1 = result
        r2 = token_tools.token_processing_hook_permissions(id_token, user)
        self.assertEqual(r1, r2)

    @override_settings(JWT_EXTRA_SECRET_KEY='99acb22351869b82ed165080c6f9cc14bc795256af2e3b7d0984727e45e980c0')
    def test_token_processing_hook_audience_user_sub_cached(self):
        user = profiles_factory.CustomUserFactory()
        oidc_extra = factory.OidcClientExtraFactory()
        id_token = {'aud': oidc_extra.oidc_client.client_id}

        result = token_tools.token_processing_hook_audience_user_sub(id_token, user)

        self.assertTrue('extra' in result)
        self.assertTrue(token_tools.JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY in result['extra'])
        self.assertEqual(result['extra'][token_tools.JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY], oidc_extra.user.sub)

        r1 = result
        r2 = token_tools.token_processing_hook_audience_user_sub(id_token, user)
        self.assertEqual(r1, r2)

    @override_settings(JWT_EXTRA_SECRET_KEY='99acb22351869b82ed165080c6f9cc14bc795256af2e3b7d0984727e45e980c0')
    def test_token_processing_hook_encode_extra(self):
        user = profiles_factory.CustomUserFactory()
        id_token = self.test_token_processing_hook_permissions()
        extra = id_token['extra']
        result = token_tools.token_processing_hook_encode_extra(id_token, user)

        self.assertTrue('extra' in result)
        self.assertIsInstance(result['extra'], str)
        self.assertEqual(decrypt_b64(result['extra']), extra)
