import json
import time

import faker
from django.contrib.auth import get_user_model
from django.core.mail.message import EmailMultiAlternatives
from django.core.management import call_command
from django.core.servers.basehttp import WSGIServer
from django.test.testcases import LiveServerThread, QuietWSGIRequestHandler
from django.test.utils import modify_settings
from django.urls import reverse
from mock import patch
from oidc_provider.lib.utils.token import create_id_token, encode_id_token
from rest_framework import status
from rest_framework.test import APITestCase, APIRequestFactory, APILiveServerTestCase

from oidc.tests.factory import OidcClientExtraFactory, PermissionNodeFactory
from oidc_rest.serializers.validate_email import AddEmailSerializer
from oidc_rest.views.validate_email import EmailListCreateAPIView
from profiles.tests.factory import CustomUserFactory

fake = faker.Faker('en')


class ResetPasswordApiViewTestCase(APITestCase):
    def setUp(self):
        self.endpoint_url = reverse('oidc_rest:password_reset')

    def test_input_validation_missing(self):
        data = {}
        response = self.client.post(self.endpoint_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('lookup_value' in response.json())
        self.assertTrue('This field is required.' in response.json()['lookup_value'])

    def test_input_validation_blank(self):
        data = {'lookup_value': ''}
        response = self.client.post(self.endpoint_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('lookup_value' in response.json())
        self.assertTrue('This field may not be blank.' in response.json()['lookup_value'])

    @patch.object(time, 'sleep')
    @patch.object(EmailMultiAlternatives, 'send')
    def test_sleeping_when_user_not_found(self, mock_send, mock_sleep):
        data = {'lookup_value': 'not_used_email@example.not_exists.com.uk'}
        response = self.client.post(self.endpoint_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertFalse(mock_send.called)
        self.assertTrue(mock_sleep.called)

    @patch.object(time, 'sleep')
    @patch.object(EmailMultiAlternatives, 'send')
    def test_email_send(self, mock_send, mock_sleep):
        user = CustomUserFactory()
        data = {'lookup_value': user.display_name}
        response = self.client.post(self.endpoint_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertFalse(mock_sleep.called)
        self.assertTrue(mock_send.called)


class NewPasswordApiViewTestCase(APITestCase):
    def setUp(self):
        self.password_reset_url = reverse('oidc_rest:password_reset')
        self.password_change_url = reverse('oidc_rest:password_reset__change')

    @patch('oidc_rest.views.reset_password.ResetPasswordApiView.generate_email_message', return_value='test')
    def test_change_password(self, mock):
        user = CustomUserFactory()
        data = {'lookup_value': user.display_name}
        response = self.client.post(self.password_reset_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        key = mock.call_args[0][2]
        password = fake.password(30)

        data = {'key': key, 'new_password': password}
        response = self.client.post(self.password_change_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        user = get_user_model().objects.get(pk=user.pk)
        self.assertTrue(user.check_password(password))

    @patch('oidc_rest.views.reset_password.ResetPasswordApiView.generate_email_message', return_value='test')
    def test_change_password_twice(self, mock):
        user = CustomUserFactory()
        data = {'lookup_value': user.display_name}
        response = self.client.post(self.password_reset_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        key = mock.call_args[0][2]
        password = fake.password(30)

        data = {'key': key, 'new_password': password}

        response = self.client.post(self.password_change_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        password = fake.password(30)
        data['new_password'] = password
        response = self.client.post(self.password_change_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('key' in response.json())
        self.assertEqual(response.json()['key'][0], 'Key is invalid')

    @patch('oidc_rest.views.reset_password.ResetPasswordApiView.generate_email_message', return_value='test')
    def test_change_password_too_simple(self, mock):
        user = CustomUserFactory()
        data = {'lookup_value': user.display_name}
        response = self.client.post(self.password_reset_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        key = mock.call_args[0][2]
        password = '12345'

        data = {'key': key, 'new_password': password}

        response = self.client.post(self.password_change_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('new_password' in response.json())


class RegistrationCreateApiViewTestCase(APITestCase):
    def setUp(self):
        self.registration_url = reverse('oidc_rest:registration')
        self.oidc_client = OidcClientExtraFactory().oidc_client

    def test_success_registration(self):
        email = fake.email()
        password = fake.password(30)
        client_id = self.oidc_client.client_id

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.filter(emails__email=email).first()
        self.assertIsNotNone(user)
        self.assertTrue(user.check_password(password))

    def test_success_registration_with_username(self):
        email = fake.email()
        password = fake.password(30)
        username = fake.user_name()
        client_id = self.oidc_client.client_id

        data = {
            'username': username,
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.filter(emails__email=email).first()
        self.assertIsNotNone(user)
        self.assertTrue(user.check_password(password))
        user2 = get_user_model().objects.filter(username=username).first()
        self.assertIsNotNone(user2)
        self.assertTrue(user2.check_password(password))
        self.assertEqual(user.pk, user2.pk)

    def test_validation_empty_email(self):
        password = fake.password(30)
        client_id = self.oidc_client.client_id

        data = {
            'password': password,
            'originators_client_id': client_id
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_wrong_email_type(self):
        email = fake.password(30)
        password = fake.password(30)
        client_id = self.oidc_client.client_id

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_empty_password(self):
        email = fake.email()
        client_id = self.oidc_client.client_id

        data = {
            'email': email,
            'originators_client_id': client_id
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_wrong_password_type(self):
        email = fake.email()
        password = '12345'
        client_id = self.oidc_client.client_id

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_empty_client(self):
        email = fake.password(30)
        password = fake.password(30)

        data = {
            'email': email,
            'password': password,
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_wrong_client_type(self):
        email = fake.email()
        password = fake.password(30)
        client_id = 'unknown'

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch.object(EmailMultiAlternatives, 'send')
    def test_send_mail_after_registration(self, send_mock):
        email = fake.email()
        password = fake.password(30)
        client_id = self.oidc_client.client_id

        data = {
            'email': email,
            'password': password,
            'originators_client_id': client_id
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.filter(emails__email=email).first()
        self.assertIsNotNone(user)
        self.assertTrue(user.check_password(password))
        self.assertTrue(user.is_limited)
        send_mock.assert_called_once()


class LiveServerThreadPort(LiveServerThread):
    force_port = 8000

    def _create_server(self, port):
        return WSGIServer((self.host, self.force_port or port), QuietWSGIRequestHandler, allow_reuse_address=False)


class AddEmailApiViewTestCase(APILiveServerTestCase):
    server_thread_class = LiveServerThreadPort
    host = '127.0.0.1'
    factory = APIRequestFactory()
    email_add_url = reverse('oidc_rest:email_list_create')

    @classmethod
    def setUpClass(cls):
        modify_settings(ALLOWED_HOSTS={'append': cls.host})
        return super().setUpClass()

    def setUp(self):
        call_command('creatersakey')
        self.user = CustomUserFactory()
        self.oidc_client = OidcClientExtraFactory().oidc_client
        self.perm = PermissionNodeFactory(name='oidc:email:write')
        self.view = EmailListCreateAPIView.as_view()

    def get_request(self, perms=None, url=None, user=None, data=None):
        request = self.factory.post(url, data=json.dumps(data), content_type='application/json')

        if user is not None:
            if perms is None:
                perms = []
            elif not isinstance(perms, (list, tuple)):
                perms = list(perms)

            if perms is None or not perms:
                user.oidc_permissions.clear()
            else:
                user.oidc_permissions.set(perms)
            token = encode_id_token(create_id_token(user, self.oidc_client.client_id), self.oidc_client)
            request.META['HTTP_AUTHORIZATION'] = 'Bearer {}'.format(token).encode()
        return request

    @patch.object(EmailMultiAlternatives, 'send')
    def test_simple_ok(self, email_send_mock):
        email = fake.email()
        request = self.get_request([self.perm], self.email_add_url, self.user, {'email': email})

        response = self.view(request=request)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        email_send_mock.assert_called_once()

    @patch.object(EmailMultiAlternatives, 'send')
    def test_not_auth_user(self, email_send_mock):
        email = fake.email()
        request = self.get_request(perms=[self.perm], url=self.email_add_url, data={'email': email})

        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        email_send_mock.assert_not_called()

    @patch.object(EmailMultiAlternatives, 'send')
    def test_no_permissions(self, email_send_mock):
        email = fake.email()
        request = self.get_request([], self.email_add_url, self.user, {'email': email})

        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        email_send_mock.assert_not_called()


class VerifyEmailApiViewTestCase(APITestCase):
    target_url = reverse('oidc_rest:email_verify')

    def setUp(self):
        self.user = CustomUserFactory()

    def _get_key(self, user, email):
        ser = AddEmailSerializer(data={'user': user.pk, 'email': email})
        ser.is_valid(raise_exception=True)
        return ser.validated_data.get('key')

    def test_simple_verify(self):
        # noinspection PyTypeChecker
        key = self._get_key(self.user, self.user.email)
        data = {
            'key': key
        }

        user = get_user_model().objects.get(pk=self.user.pk)
        email = user.emails.get(email=self.user.email)
        self.assertTrue(user.is_limited)
        self.assertFalse(email.is_verified)
        self.assertTrue(email.is_primary)

        response = self.client.post(self.target_url, data=data, format='json')
        user = get_user_model().objects.get(pk=self.user.pk)
        email = user.emails.get(email=self.user.email)

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertFalse(user.is_limited)
        self.assertTrue(email.is_verified)
        self.assertTrue(email.is_primary)

    def test_user_already_limitless(self):
        self.user.emails.first().set_verified()
        self.user.activate_user()

        new_email = fake.email()
        self.user = get_user_model().objects.get(pk=self.user.pk)

        key = self._get_key(self.user, new_email)
        data = {
            'key': key
        }

        user = get_user_model().objects.get(pk=self.user.pk)
        email = user.emails.get(email=self.user.email)
        self.assertFalse(user.is_limited)
        self.assertTrue(email.is_verified)
        self.assertTrue(email.is_primary)

        # new email should not exists
        self.assertFalse(user.emails.filter(email=new_email).exists())

        response = self.client.post(self.target_url, data=data, format='json')
        user = get_user_model().objects.get(pk=self.user.pk)
        email = user.emails.get(email=self.user.email)
        new_email = user.emails.get(email=new_email)

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertFalse(user.is_limited)
        self.assertTrue(email.is_verified)
        self.assertTrue(email.is_primary)
        self.assertTrue(new_email.is_verified)
        self.assertFalse(new_email.is_primary)
