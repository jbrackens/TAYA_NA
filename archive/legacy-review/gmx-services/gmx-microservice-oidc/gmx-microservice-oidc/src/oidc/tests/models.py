import faker
import nacl.signing
from django.core.exceptions import ValidationError
from django.test.testcases import TestCase

from oidc import models
from profiles.tests.factory import CustomUserFactory
from . import factory

fake = faker.Faker('en')


class TreeNodeTestCase(TestCase):
    def test_base_model_creation(self):
        name = fake.name()
        node = models.BaseTreeNode(name=name)
        node.full_clean()
        node.save()
        self.assertEqual(node.name, name, "Name should be the same")

    def test_group_model_creation(self):
        name = fake.name()
        node = models.GroupNode(name=name)
        node.full_clean()
        node.save()
        self.assertNotEqual(node.name, name, 'Name shouldnot be the same')
        self.assertEqual(node.name, name.replace(' ', '_').upper())
        self.assertIsInstance(node, models.BaseTreeNode)
        self.assertIsInstance(node, models.GroupNode)
        self.assertTrue(node.can_have_children)
        self.assertTrue(node.can_be_root)

    def test_permission_model_creation(self):
        name = fake.name()
        description = fake.text(90)

        node = models.PermissionNode(name=name, description=description)
        with self.assertRaises(ValidationError):
            node.full_clean()

    def test_permission_model_with_factory(self):
        node = factory.PermissionNodeFactory()
        self.assertIsInstance(node.parent, models.GroupNode)
        self.assertIsInstance(node, models.PermissionNode)
        self.assertRegex(node.name, r'^[a-z 0-9]+\.$')

    def test_permission_model_with_factory_without_parent(self):
        with self.assertRaises(ValidationError):
            factory.PermissionNodeFactory(parent=None)


class OidcClientExtraTestCase(TestCase):
    def test_oidc_client_extra_simple(self):
        oidc_client_extra = factory.OidcClientExtraFactory()
        self.assertTrue('{}'.format(oidc_client_extra).startswith('OIDC Extra'))
        self.assertEqual(oidc_client_extra.default_permissions.count(), 0)
        self.assertEqual(oidc_client_extra.limited_permissions.count(), 0)

        self.assertIsInstance(oidc_client_extra.ed25519_private_key, nacl.signing.SigningKey)
        self.assertIsInstance(oidc_client_extra.ed25519_public_key, nacl.signing.VerifyKey)

    def test_oidc_extra_wrong_user(self):
        with self.assertRaises(ValidationError):
            factory.OidcClientExtraFactory(user=CustomUserFactory())

    def test_oidc_extra_adding_default_permission(self):
        p1 = factory.PermissionNodeFactory()
        oidc_client_extra = factory.OidcClientExtraFactory(default_permissions=[p1])
        self.assertEqual(oidc_client_extra.default_permissions.count(), 1)
        self.assertEqual(oidc_client_extra.limited_permissions.count(), 0)
        self.assertEqual(oidc_client_extra.default_permissions.first().pk, p1.pk)

    def test_oidc_extra_adding_limited_permission(self):
        p1 = factory.PermissionNodeFactory()
        oidc_client_extra = factory.OidcClientExtraFactory(limited_permissions=[p1])
        self.assertEqual(oidc_client_extra.default_permissions.count(), 0)
        self.assertEqual(oidc_client_extra.limited_permissions.count(), 1)
        self.assertEqual(oidc_client_extra.limited_permissions.first().pk, p1.pk)

    def test_oidc_extra_getting_default_permission(self):
        p1 = factory.PermissionNodeFactory()
        p2 = factory.PermissionNodeFactory(name=p1.name)
        oidc_client_extra = factory.OidcClientExtraFactory(default_permissions=[p1, p2, p1.parent])
        self.assertEqual(oidc_client_extra.default_permissions.count(), 3)
        self.assertEqual(len(oidc_client_extra.get_default_permissions()), 2)

    def test_oidc_extra_getting_limited_permission(self):
        p1 = factory.PermissionNodeFactory()
        p2 = factory.PermissionNodeFactory(name=p1.name)
        oidc_client_extra = factory.OidcClientExtraFactory(limited_permissions=[p1, p2, p1.parent])
        self.assertEqual(oidc_client_extra.limited_permissions.count(), 3)
        self.assertEqual(len(oidc_client_extra.get_limited_permissions()), 2)


class SocialSecretTestCase(TestCase):
    def test_simple_social_secret_factory(self):
        ss = factory.SocialSecretFactory()
        self.assertTrue('{}'.format(ss).startswith('SocialSecret'))
        self.assertIsNotNone(ss.pk)

    def test_duplication_social_secret_type(self):
        ss = factory.SocialSecretFactory()
        with self.assertRaises(ValidationError):
            factory.SocialSecretFactory(oidc_client_extra=ss.oidc_client_extra, social_type=ss.social_type)
