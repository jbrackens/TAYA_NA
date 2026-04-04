import random
import string

import faker
from django.core import management
from django.core.exceptions import ValidationError
from django.test import TestCase

from oidc.tests import factory as oidc_factory
from profiles import models
from profiles.tests import factory as profiles_factory
from django.conf import settings

fake = faker.Faker('en_GB')


class UserModelTestCase(TestCase):
    @staticmethod
    def _get_random_string(length=20):
        return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(length))

    @staticmethod
    def create_user(username=None, password=None, email=None):
        originator = models.CustomUser.objects.get(username=settings.REWARD_MATRIX_USER)

        kwargs = {'originator': originator}
        if username is not None:
            kwargs['username'] = username
        if password is not None:
            kwargs['password'] = password
        if email is not None:
            kwargs['email'] = email

        return profiles_factory.CustomUserFactory(**kwargs)

    def setUp(self):
        management.call_command('provision_users')

    def test_create_super_user(self):
        username = self._get_random_string(36)
        password = self._get_random_string(36)
        email = '{}@example.com'.format(username)
        user = models.CustomUser.objects.create_superuser(
            username=username,
            password=password,
            email=email
        )
        self.assertTrue(user.id, 'User ID can NOT be null')
        self.assertEqual(user.id, user.pk, 'User PK must equals ID')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertEqual(user.username, username)
        self.assertTrue(user.check_password(password))

    def test_create_user(self):
        username = self._get_random_string(36)
        password = self._get_random_string(36)
        email = '{}@example.com'.format(username)
        user = self.create_user(
            username=username,
            password=password,
            email=email
        )
        self.assertTrue(user.id, 'User ID can NOT be null')
        self.assertEqual(user.id, user.pk, 'User PK must equals ID')
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_limited)
        self.assertTrue(user.is_active)
        self.assertEqual(user.username, username)
        self.assertTrue(user.check_password(password))

    def test_activate_user(self):
        user = self.create_user()
        user.activate_user()
        self.assertTrue(user.is_active, 'User should be active')
        self.assertFalse(user.is_limited, 'User should be not limited')

    def test_deactivate_user(self):
        user = self.create_user()
        user.deactivate_user()
        self.assertFalse(user.is_active, 'User should be not active')

    def test_user_has_email_object(self):
        email = '{}@example.com'.format(self._get_random_string())
        user = self.create_user(email=email)
        self.assertTrue(models.Email.objects.filter(email=email).exists(), 'Email exists in system')
        self.assertTrue(models.Email.objects.filter(user=user, email=email).exists(), 'Email exists and connected to user')
        self.assertTrue(models.Email.objects.filter(email=email, is_primary=True).exists(), 'Email should be set as primary')
        self.assertEqual(user.emails.first().pk, models.Email.objects.get(email=email).pk, 'User first email should be the same object')

    def test_user_change_email(self):
        email1 = '{}@example.com'.format(self._get_random_string())
        email2 = '{}@example.com'.format(self._get_random_string())

        user = self.create_user(email=email1)

        try:
            user.change_email(new_email=email2)
        except ValidationError as e:
            self.assertTrue(isinstance(e, ValidationError), 'Should be ValidationError exception')
            self.assertTrue('email' in e.error_dict, 'Should be ValidationError exception and key "email"')
        else:
            self.fail('Validation Exception was NOT been thrown.')

    def test_user_change_email_for_different_user(self):
        user1 = self.create_user()
        user2 = self.create_user()

        try:
            user1.change_email(new_email=user2.email)
        except ValidationError as e:
            self.assertTrue(isinstance(e, ValidationError), 'Should be ValidationError exception')
            self.assertTrue('email' in e.error_dict, 'Should be ValidationError exception and key "email"')
        else:
            self.fail('Validation Exception was NOT been thrown.')

    def test_user_change_email_for_verified_email_obj(self):
        user = self.create_user()
        orig_email = user.email
        email_str = '{}@example.com'.format(self._get_random_string())

        email = models.Email.objects.create(user=user, email=email_str)

        email.set_verified()

        user.change_email(new_email=email)

        self.assertEqual(user.email, email.email, '1 Emails should match')
        self.assertEqual(user.email, email_str, '2 Emails should match')
        self.assertEqual(user.emails.count(), 2, 'User should have two emails')
        self.assertNotEqual(user.email, orig_email, 'User should have changed email')
        self.assertTrue(user.emails.filter(email=orig_email).exists(), 'Old email should exists')
        self.assertFalse(user.emails.get(email=orig_email).is_primary, 'Old email should NOT be primary')

    def test_user_change_email_for_not_verified_email_obj(self):
        user = self.create_user()
        orig_email = user.email
        email_str = '{}@example.com'.format(self._get_random_string())

        email = models.Email.objects.create(user=user, email=email_str)

        try:
            user.change_email(new_email=email)
        except ValidationError as e:
            self.assertTrue('is_primary' in e.error_dict, '"is_primary" flag should be in ValidationException')
        else:
            self.fail("ValidationException has not been thrown.")

        self.assertEqual(user.email, orig_email, 'Email should not be changed')
        self.assertFalse(email.is_primary, "Email should not be primary")
        self.assertFalse(email.is_verified, "Email should not be verified")

    def test_user_change_email_for_verified_email(self):
        user = self.create_user()
        orig_email = user.email
        email_str = fake.email()

        email = profiles_factory.EmailFactory(user=user, email=email_str)

        email.set_verified()

        user.change_email(new_email=email_str)

        self.assertEqual(user.email, email.email, '1 Emails should match')
        self.assertEqual(user.email, email_str, '2 Emails should match')
        self.assertEqual(user.emails.count(), 2, 'User should have two emails')
        self.assertNotEqual(user.email, orig_email, 'User should have changed email')
        self.assertTrue(user.emails.filter(email=orig_email).exists(), 'Old email should exists')
        self.assertFalse(user.emails.get(email=orig_email).is_primary, 'Old email should NOT be primary')

    def test_user_change_email_for_not_verified_email(self):
        user = self.create_user()
        orig_email = user.email
        email_str = '{}@example.com'.format(self._get_random_string())

        email = models.Email.objects.create(user=user, email=email_str)

        try:
            user.change_email(new_email=email_str)
        except ValidationError as e:
            self.assertTrue('is_primary' in e.error_dict, '"is_primary" flag should be in ValidationException')
        else:
            self.fail("ValidationException has not been thrown.")

        self.assertEqual(user.email, orig_email, 'Email should not be changed')
        self.assertFalse(email.is_primary, "Email should not be primary")
        self.assertFalse(email.is_verified, "Email should not be verified")

    def test_user_change_email_for_not_verified_email_and_not_creating_object(self):
        user = self.create_user()
        orig_email = user.email
        email_str = '{}@example.com'.format(self._get_random_string())

        try:
            user.change_email(new_email=email_str)
        except ValidationError as e:
            self.assertTrue('email' in e.error_dict, '"email" flag should be in ValidationException')
        else:
            self.fail("ValidationException has not been thrown.")

        self.assertEqual(user.email, orig_email, 'Email should not be changed')
        self.assertFalse(models.Email.objects.filter(email=email_str).exists(), "Email object should not exists")

    def test_oidc_extra_adding_limited_permission(self):
        p1 = oidc_factory.PermissionNodeFactory()
        user = profiles_factory.CustomUserFactory(oidc_permissions=[p1])
        self.assertEqual(user.oidc_permissions.count(), 1)
        self.assertEqual(len(user.get_oidc_permissions()), 1)
        self.assertEqual(user.oidc_permissions.first().pk, p1.pk)

    def test_oidc_extra_getting_default_permission(self):
        p1 = oidc_factory.PermissionNodeFactory()
        p2 = oidc_factory.PermissionNodeFactory(name=p1.name)
        user = profiles_factory.CustomUserFactory(oidc_permissions=[p1, p2, p1.parent])
        self.assertEqual(user.oidc_permissions.count(), 3)
        self.assertEqual(len(user.get_oidc_permissions()), 2)


class PhoneTestCase(TestCase):
    WRONG_NUMBER = '+480601dd602603'
    GOOD_NUMBER = '++48601602603'

    @staticmethod
    def create_phone(user=None, phone_number=GOOD_NUMBER):
        if user is None:
            user = UserModelTestCase.create_user()
        phone = models.Phone(user=user, phone_number=phone_number)
        phone.full_clean()
        phone.save()
        return phone

    def setUp(self):
        management.call_command('provision_users')

    def test_create_phone(self):
        phone = self.create_phone()
        self.assertIsNotNone(phone, 'Phone object is not NONE')
        self.assertIsNotNone(phone.pk, 'Phone PK is not NONE')
        self.assertFalse(phone.is_primary, '"is_primary" flag should not be set')
        self.assertFalse(phone.is_verified, '"is_verified" flag should not be set')
        self.assertEqual(phone.user.phones.count(), 1, 'User should have only one phone')

    def test_create_wrong_phone(self):
        try:
            self.create_phone(phone_number=self.WRONG_NUMBER)
        except ValidationError as e:
            self.assertTrue('phone_number' in e.error_dict, '"phone_number" field should be in error list')
        else:
            self.fail("Creating wring phone should throw an exception")

    def test_set_unverified_phone_as_primary(self):
        phone = self.create_phone()
        try:
            phone.set_as_primary()
        except ValidationError as e:
            self.assertTrue('is_primary' in e.error_dict, '"is_primary" should be on error list')
            self.assertFalse(phone.is_primary, '"is_primary" flag should not be set')
        else:
            self.fail('setting "is_primary" to unverified phone should throw an exception')

    def test_set_phone_as_verified(self):
        phone = self.create_phone()
        phone.set_verified()
        self.assertTrue(phone.is_verified, '"is_verified" flad should be set')
        self.assertFalse(phone.is_primary, '"is_primary" flag should not be set')

    def test_set_phone_as_primary(self):
        phone = self.create_phone()
        phone.set_verified()
        phone.set_as_primary()
        self.assertTrue(phone.is_verified, '"is_verified" flad should be set')
        self.assertTrue(phone.is_primary, '"is_primary" flag should be set')

    def test_phone_duplication(self):
        phone = self.create_phone()
        try:
            self.create_phone(user=phone.user)
        except ValidationError as e:
            self.assertTrue('__all__' in e.error_dict, 'Validation error should be thrown on phone duplication')
        else:
            self.fail('Validation error should be thrown on phone duplication')

    def test_delete_phone(self):
        phone = profiles_factory.PhoneFactory()
        pk = phone.pk
        self.assertTrue(models.Phone.objects.filter(pk=pk).exists())
        phone.delete()
        self.assertFalse(models.Phone.objects.filter(pk=pk).exists())

    def test_delete_phone_verified(self):
        phone = profiles_factory.PhoneFactory()
        phone.set_verified()
        pk = phone.pk
        self.assertTrue(models.Phone.objects.filter(pk=pk).exists())
        phone.delete()
        self.assertFalse(models.Phone.objects.filter(pk=pk).exists())

    def test_delete_phone_primary(self):
        phone = profiles_factory.PhoneFactory()
        phone.set_verified()
        phone.set_as_primary()
        pk = phone.pk
        self.assertTrue(models.Phone.objects.filter(pk=pk).exists())
        with self.assertRaises(models.ValidationError):
            phone.delete()
        self.assertTrue(models.Phone.objects.filter(pk=pk).exists())

    def test_phone_edit(self):
        phone = profiles_factory.PhoneFactory()
        source = phone.phone_number
        new_phone = profiles_factory.get_random_valid_number()
        self.assertNotEqual(source, new_phone)
        phone.phone_number = new_phone

        instance = models.Phone.objects.get(pk=phone.pk)
        self.assertEqual(instance.phone_number, source)

        phone.full_clean()
        phone.save()
        instance = models.Phone.objects.get(pk=phone.pk)
        self.assertNotEqual(instance.phone_number, source)
        self.assertEqual(instance.phone_number, new_phone)

    def test_phone_edit_verified(self):
        phone = profiles_factory.PhoneFactory()
        phone.set_verified()
        source = phone.phone_number
        new_phone = profiles_factory.get_random_valid_number()
        self.assertNotEqual(source, new_phone)
        phone.phone_number = new_phone

        instance = models.Phone.objects.get(pk=phone.pk)
        self.assertEqual(instance.phone_number, source)

        phone.full_clean()
        with self.assertRaises(ValidationError):
            phone.save()
        instance = models.Phone.objects.get(pk=phone.pk)
        self.assertEqual(instance.phone_number, source)
        self.assertNotEqual(instance.phone_number, new_phone)


class AddressTestCase(TestCase):
    @staticmethod
    def create_address(user=None):
        fake = faker.Faker('en')
        if user is None:
            user = UserModelTestCase.create_user()
        address = models.Address(
            user=user,
            line_1=fake.street_address(),
            line_2=fake.secondary_address(),
            city=fake.city(),
            post_code=fake.postalcode_plus4(),
            region=fake.state()
        )
        address.full_clean()
        address.save()
        return address

    def setUp(self):
        management.call_command('provision_users')

    def test_create_address(self):
        address = self.create_address()
        self.assertIsNotNone(address, 'Phone object is not NONE')
        self.assertIsNotNone(address.pk, 'Phone PK is not NONE')
        self.assertFalse(address.is_primary, '"is_primary" flag should not be set')
        self.assertFalse(address.is_verified, '"is_verified" flag should not be set')
        self.assertEqual(address.user.addresses.count(), 1, 'User should have only one address')

    def test_set_unverified_address_as_primary(self):
        address = self.create_address()
        try:
            address.set_as_primary()
        except ValidationError as e:
            self.assertTrue('is_primary' in e.error_dict, '"is_primary" should be on error list')
            self.assertFalse(address.is_primary, '"is_primary" flag should not be set')
        else:
            self.fail('setting "is_primary" to unverified phone should throw an exception')

    def test_set_address_as_verified(self):
        address = self.create_address()
        address.set_verified()
        self.assertTrue(address.is_verified, '"is_verified" flad should be set')
        self.assertFalse(address.is_primary, '"is_primary" flag should not be set')

    def test_set_address_as_primary(self):
        address = self.create_address()
        address.set_verified()
        address.set_as_primary()
        self.assertTrue(address.is_verified, '"is_verified" flad should be set')
        self.assertTrue(address.is_primary, '"is_primary" flag should be set')

    def test_create_many_addresses(self):
        address1 = self.create_address()
        address2 = self.create_address(address1.user)
        self.assertEqual(address1.user.pk, address2.user.pk, "Addresses should have the same user")
        self.assertNotEqual(address1.pk, address2.pk, 'Addresses should have different pk')
        self.assertEqual(address1.user.addresses.count(), 2, "User should have two addreses")

    def test_create_many_addresses_one_verified(self):
        address1 = self.create_address()
        address2 = self.create_address(address1.user)
        address2.set_verified()
        self.assertEqual(address1.user.pk, address2.user.pk, "Addresses should have the same user")
        self.assertNotEqual(address1.pk, address2.pk, 'Addresses should have different pk')
        self.assertEqual(address1.user.addresses.count(), 2, "User should have two addreses")
        self.assertFalse(address1.is_verified, 'Address 1 should not be vefiried')
        self.assertTrue(address2.is_verified, 'Address 2 should by verified')

    def test_create_many_addresses_one_primary(self):
        address1 = self.create_address()
        address2 = self.create_address(address1.user)
        address2.set_verified()
        address2.set_as_primary()
        self.assertEqual(address1.user.pk, address2.user.pk, "Addresses should have the same user")
        self.assertNotEqual(address1.pk, address2.pk, 'Addresses should have different pk')
        self.assertEqual(address1.user.addresses.count(), 2, "User should have two addreses")
        self.assertFalse(address1.is_verified, 'Address 1 should not be vefiried')
        self.assertTrue(address2.is_verified, 'Address 2 should by verified')
        self.assertTrue(address2.is_primary, 'Address 2 should by primary')
        self.assertEqual(address1.user.addresses.filter(is_primary=True).count(), 1, "only one should be primary")

    def test_many_addresses_change_primary(self):
        address1 = self.create_address()
        address2 = self.create_address(address1.user)
        address1.set_verified()
        address2.set_verified()
        address1.set_as_primary()
        address2.set_as_primary()
        address1 = address1.user.addresses.filter(is_primary=False).first()
        self.assertTrue(address2.is_primary, 'address2 should be set as primary')
        self.assertFalse(address1.is_primary, 'address1 shound NOT be primary')
