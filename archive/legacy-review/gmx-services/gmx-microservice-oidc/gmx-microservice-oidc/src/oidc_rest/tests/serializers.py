import time

import faker
from django.contrib.auth import get_user_model
from django.test.client import RequestFactory
from django.test.testcases import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory

from oidc.tests.factory import OidcClientExtraFactory
from oidc_rest.serializers import reset_password, registration, validate_email
from profiles.tests.factory import CustomUserFactory, EmailFactory

fake = faker.Faker('en')


class ResetPasswordSerializerTestCase(TestCase):
    def setUp(self):
        self.user = CustomUserFactory()
        self.user.emails.all().first().set_verified()

    def test_find_user_by_username(self):
        serializer = reset_password.ResetPasswordSerializer(data={'lookup_value': self.user.username})
        serializer.is_valid(raise_exception=True)
        self.assertIsNotNone(serializer.validated_data['user'])
        self.assertEqual(serializer.validated_data['user'], self.user)

    def test_find_user_by_display_name(self):
        serializer = reset_password.ResetPasswordSerializer(data={'lookup_value': self.user.display_name})
        serializer.is_valid(raise_exception=True)
        self.assertIsNotNone(serializer.validated_data['user'])
        self.assertEqual(serializer.validated_data['user'], self.user)

    def test_find_user_by_email(self):
        serializer = reset_password.ResetPasswordSerializer(data={'lookup_value': self.user.email})
        serializer.is_valid(raise_exception=True)
        self.assertIsNotNone(serializer.validated_data['user'])
        self.assertEqual(serializer.validated_data['user'], self.user)

    def test_no_find_user_by_fake_email(self):
        serializer = reset_password.ResetPasswordSerializer(data={'lookup_value': 'abc_' + self.user.email})
        serializer.is_valid(raise_exception=True)
        self.assertIsNone(serializer.validated_data['user'])

    def test_no_find_user_by_unverified_email(self):
        email = EmailFactory(user=self.user)
        serializer = reset_password.ResetPasswordSerializer(data={'lookup_value': email.email})
        serializer.is_valid(raise_exception=True)
        self.assertIsNone(serializer.validated_data['user'])

    def test_find_user_by_verified_second_email(self):
        email = EmailFactory(user=self.user)
        email.set_verified()
        serializer = reset_password.ResetPasswordSerializer(data={'lookup_value': email.email})
        serializer.is_valid(raise_exception=True)
        self.assertIsNotNone(serializer.validated_data['user'])
        self.assertEqual(serializer.validated_data['user'], self.user)


class FutureValidatorTestCase(TestCase):
    def test_future_validator(self):
        now = int(time.time())
        with self.assertRaises(ValidationError):
            reset_password.future_validator(now - 10)
            reset_password.future_validator(time.time() + 10)


class PasswordKeyObjectSerializerTestCase(TestCase):
    def setUp(self):
        self.user = CustomUserFactory()

    def test_pass_time_serializer_validation(self):
        data = {
            'u': self.user.pk,
            'e': int(time.time()) + 10
        }
        s = reset_password.PasswordKeyObjectSerializer(data=data)
        self.assertTrue(s.is_valid(True))

    def test_pass_time_serializer_validation_past_time(self):
        data = {
            'u': self.user.pk,
            'e': (time.time()) - 10
        }
        s = reset_password.PasswordKeyObjectSerializer(data=data)
        self.assertFalse(s.is_valid())
        with self.assertRaises(ValidationError):
            s.is_valid(raise_exception=True)


class PasswordKeyEncoderSerializerTestCase(TestCase):
    def setUp(self):
        self.user = CustomUserFactory()
        self.request = RequestFactory().post('/')

    def test_generate_reset_key(self):
        s = reset_password.PasswordKeyEncoderSerializer(data={'user': self.user.pk}, context={'request': self.request})
        self.assertTrue(s.is_valid())
        self.assertTrue('key' in s.validated_data)
        self.assertGreater(len(s.validated_data['key']), 0)

    def test_decode_reset_key(self):
        s = reset_password.PasswordKeyEncoderSerializer(data={'user': self.user.pk}, context={'request': self.request})
        self.assertTrue(s.is_valid())
        key = s.validated_data['key']
        s2 = reset_password.PasswordKeyEncoderSerializer(data={'key': key}, context={'request': self.request})
        self.assertTrue(s2.is_valid())
        self.assertEqual(s2.validated_data['user'], self.user)


class RegistrationSerializer(TestCase):
    def setUp(self):
        self.client = OidcClientExtraFactory().oidc_client
        self.request = RequestFactory().post('/')

    def test_create_simple_user(self):
        email = fake.email()
        password = fake.password(30)
        client_id = self.client.client_id

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        s = registration.RegistrationSerializer(data=data, context={'request': self.request})
        self.assertTrue(s.is_valid(True))
        user = s.save()
        user2 = get_user_model().objects.filter(emails__email=email).first()
        self.assertIsNotNone(user2)
        self.assertEqual(user.pk, user2.pk)
        self.assertEqual(user.email, user2.email)
        self.assertEqual(user.email, email)
        self.assertTrue(user2.check_password(password))

    def test_create_simple_user_wth_username(self):
        email = fake.email()
        username = fake.user_name()
        password = fake.password(30)
        client_id = self.client.client_id

        data = {
            'username': username,
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        s = registration.RegistrationSerializer(data=data, context={'request': self.request})
        self.assertTrue(s.is_valid(True))
        user = s.save()
        user2 = get_user_model().objects.filter(username=username).first()
        self.assertIsNotNone(user2)
        self.assertEqual(user.pk, user2.pk)
        self.assertEqual(user.email, user2.email)
        self.assertEqual(user.email, email)
        self.assertEqual(user.username, user2.username)
        self.assertEqual(user.username, username)
        self.assertTrue(user2.check_password(password))

    def test_validation_empty_email(self):
        password = fake.password(30)
        client_id = self.client.client_id

        data = {
            'password': password,
            'originators_client_id': client_id
        }

        s = registration.RegistrationSerializer(data=data, context={'request': self.request})
        with self.assertRaises(ValidationError):
            s.is_valid(True)

    def test_validation_wrong_email_type(self):
        email = fake.password(30)
        password = fake.password(30)
        client_id = self.client.client_id

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        s = registration.RegistrationSerializer(data=data, context={'request': self.request})
        with self.assertRaises(ValidationError):
            s.is_valid(True)

    def test_validation_empty_password(self):
        email = fake.email()
        client_id = self.client.client_id

        data = {
            'email': email,
            'originators_client_id': client_id
        }

        s = registration.RegistrationSerializer(data=data, context={'request': self.request})
        with self.assertRaises(ValidationError):
            s.is_valid(True)

    def test_validation_wrong_password_type(self):
        email = fake.email()
        password = '12345'
        client_id = self.client.client_id

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        s = registration.RegistrationSerializer(data=data, context={'request': self.request})
        with self.assertRaises(ValidationError):
            s.is_valid(True)

    def test_validation_empty_client(self):
        email = fake.password(30)
        password = fake.password(30)

        data = {
            'email': email,
            'password': password,
        }

        s = registration.RegistrationSerializer(data=data, context={'request': self.request})
        with self.assertRaises(ValidationError):
            s.is_valid(True)

    def test_validation_wrong_client_type(self):
        email = fake.email()
        password = fake.password(30)
        client_id = 'unknown'

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        s = registration.RegistrationSerializer(data=data, context={'request': self.request})
        with self.assertRaises(ValidationError):
            s.is_valid(True)


class AddEmailSerializerTestCase(TestCase):
    def setUp(self):
        self.user = CustomUserFactory()
        self.request = APIRequestFactory().post('/')
        self.request.user = self.user

    def test_adding_new_email(self):
        email = fake.email()
        data = {'email': email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)

        self.assertTrue('key' in serializer.validated_data)
        self.assertIsNotNone(serializer.validated_data.get('key'))

    def test_repeating_email(self):
        data = {'email': self.user.email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)

        self.assertTrue('key' in serializer.validated_data)
        self.assertIsNotNone(serializer.validated_data.get('key'))

    def test_adding_verified_email(self):
        self.user.emails.first().set_verified()
        email = self.user.email
        data = {'email': email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})

        with self.assertRaisesMessage(ValidationError, 'Email is already validated'):
            serializer.is_valid(raise_exception=True)

    def test_adding_different_user_email(self):
        user2 = CustomUserFactory()
        email = user2.email
        data = {'email': email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})

        with self.assertRaisesMessage(ValidationError, 'Unable to perform verification for this email'):
            serializer.is_valid(raise_exception=True)

    def test_trying_to_save_new_email(self):
        email = fake.email()
        data = {'email': email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)

        with self.assertRaises(RuntimeError):
            serializer.save()


class VerifyEmailSerializerTestCase(TestCase):
    def setUp(self):
        self.user = CustomUserFactory()
        self.request = APIRequestFactory().post('/')
        self.request.user = self.user

    def test_good_key(self):
        data = {'email': self.user.email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data.get('key')

        data = {'key': key}
        key_serializer = validate_email.VerifyEmailSerializer(data=data, context={'request': self.request})
        key_serializer.is_valid(raise_exception=True)
        email_instance = key_serializer.save()

        self.assertTrue(email_instance.is_verified)
        self.assertTrue(self.user.emails.first().is_verified)

    def test_duplicate_key(self):
        data = {'email': self.user.email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data.get('key')

        data = {'key': key}
        key_serializer = validate_email.VerifyEmailSerializer(data=data, context={'request': self.request})
        key_serializer.is_valid(raise_exception=True)
        key_serializer.save()

        key_serializer = validate_email.VerifyEmailSerializer(data=data, context={'request': self.request})

        with self.assertRaisesMessage(ValidationError, 'Key already used'):
            key_serializer.is_valid(raise_exception=True)

    def test_good_key_new_email(self):
        email = fake.email()
        data = {'email': email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data.get('key')

        data = {'key': key}
        key_serializer = validate_email.VerifyEmailSerializer(data=data, context={'request': self.request})
        key_serializer.is_valid(raise_exception=True)
        email_instance = key_serializer.save()

        self.assertTrue(email_instance.is_verified)
        self.assertTrue(self.user.emails.get(email=email).is_verified)

    def test_good_key_but_email_registered_meanwhile(self):
        email = fake.email()
        data = {'email': email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data.get('key')

        user2 = CustomUserFactory(email=email)

        data = {'key': key}
        key_serializer = validate_email.VerifyEmailSerializer(data=data, context={'request': self.request})

        with self.assertRaisesMessage(ValidationError, 'Key invalid'):
            key_serializer.is_valid(raise_exception=True)

    def test_good_key_new_email_returning_values_test(self):
        email = fake.email()
        data = {'email': email}
        serializer = validate_email.AddEmailSerializer(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data.get('key')

        data = {'key': key}
        key_serializer = validate_email.VerifyEmailSerializer(data=data, context={'request': self.request})
        key_serializer.is_valid(raise_exception=True)

        self.assertIsNotNone(key_serializer.validated_data.get('email_instance'))

        self.assertFalse(self.user.emails.get(email=email).is_verified)
        key_serializer.save()
        self.assertTrue(self.user.emails.get(email=email).is_verified)
