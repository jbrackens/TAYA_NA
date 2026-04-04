import logging
from unittest import TestCase

import responses
from django.conf import settings
from django.contrib.auth.models import User
from django.test import Client
from faker import Faker
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, RequestsClient

from project.factories import RmxUsernameProvider
from project.settings.services import PROCESS_CONTROLLER_HOST
from services.pc_service import PcService
from virtual_shop import models
from virtual_shop.tools import (
    get_message_id_from_request,
    get_or_create_user,
    pc_service_payment,
    pc_service_validate_token,
)

fake = Faker("en")
fake.add_provider(RmxUsernameProvider)


# initialize the APIClient app
logger = logging.getLogger(__name__)
client = Client()
rest_client = RequestsClient()
factory = APIRequestFactory()

FAKE_ID_TOKEN = "FAKE_ID_TOKEN"
FAKE_EXPIRES_IN = 15


class GetOrCreateUserTest(TestCase):
    def setUp(self):
        self.user = User.objects.create(username="TEST")

    def tearDown(self):
        User.objects.filter(username="TEST").delete()
        User.objects.filter(username="NEW_USER").delete()

    def test_valid_user(self):
        user = get_or_create_user("TEST")
        self.assertEqual(user.username, "TEST")

    def test_creating_user(self):
        user = get_or_create_user("NEW_USER")
        self.assertEqual(user.username, "NEW_USER")


class GetMessageIdFromRequestTest(TestCase):
    def test(self):
        response = client.get("/virtual_shop/orders")
        request = response.wsgi_request
        result = get_message_id_from_request(request)
        self.assertEqual(result, "unknown")


class PcServiceValidateTokenTest(TestCase):
    """Test module for tools"""

    def setUp(self):
        self.fake_user_sub = fake.rmx_username()
        responses.add(
            responses.POST,
            settings.OIDC_AUTHENTICATION_URL,
            json={"id_token": FAKE_ID_TOKEN, "expires_in": FAKE_EXPIRES_IN},
            status=200,
        )
        self.EXAMPLE_RESPONSE = {
            "company_id": fake.rmx_company_id(),
            "external_user_id": fake.numerify("########"),
            "email": fake.email(),
            "first_name": fake.user_name(),
            "user_sub": self.fake_user_sub,
        }

    @responses.activate
    def test_valid_method(self):
        responses.add(responses.POST, PcService.ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO, json=self.EXAMPLE_RESPONSE)
        self.assertEqual(pc_service_validate_token(self.fake_user_sub), self.fake_user_sub)

    @responses.activate
    def test_valid_400_method(self):
        responses.add(
            responses.POST, PcService.ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO, json=self.EXAMPLE_RESPONSE, status=400
        )

        with self.assertRaises(ValidationError):
            pc_service_validate_token("sn_12345678")

    @responses.activate
    def test_valid_403_method(self):
        responses.add(
            responses.POST, PcService.ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO, json=self.EXAMPLE_RESPONSE, status=403
        )

        with self.assertRaises(ValidationError):
            pc_service_validate_token("sn_12345678")

    @responses.activate
    def test_valid_500_method(self):
        responses.add(
            responses.POST, PcService.ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO, json=self.EXAMPLE_RESPONSE, status=500
        )

        with self.assertRaises(ValidationError):
            pc_service_validate_token("sn_12345678")

    @responses.activate
    def test_valid_exception_method(self):
        import mock

        responses.add(
            responses.POST, PcService.ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO, json=self.EXAMPLE_RESPONSE, status=200
        )

        with mock.patch("services.pc_service.PcService.exchange_sb_token_for_user") as PcMock:
            PcMock.side_effect = Exception()
            with self.assertRaises(ValidationError):
                pc_service_validate_token("sn_12345678")


class PcServicPaymentTest(TestCase):
    """Test module for tools"""

    def setUp(self):
        self.thing = None
        self.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix="sn_", pc_endpoint="/test_endpoint"
        )
        product_type_int = models.ProductType.objects.create(
            partner_configuration=self.partner_configuration, name="INT", subtype_validation="INT"
        )
        self.fake_user_sub = fake.rmx_username()
        responses.add(
            responses.POST,
            settings.OIDC_AUTHENTICATION_URL,
            json={"id_token": FAKE_ID_TOKEN, "expires_in": FAKE_EXPIRES_IN},
            status=200,
        )
        self.EXAMPLE_RESPONSE = {
            "process_id": fake.rmx_company_id(),
            "external_user_id": fake.numerify("########"),
            "email": fake.email(),
            "first_name": fake.user_name(),
            "user_sub": self.fake_user_sub,
        }

    def tearDown(self):
        models.ProductType.objects.filter(name="INT", partner_configuration=self.partner_configuration).delete()
        models.SbTechPartnerConfiguration.objects.filter(token_prefix="sn_").delete()

    @responses.activate
    def test_valid_method(self):
        responses.add(responses.POST, "{}/test_endpoint".format(PROCESS_CONTROLLER_HOST), json=self.EXAMPLE_RESPONSE)

        response = pc_service_payment(
            sb_token="sn_12345678", price=100, title="Test_title", order_uid="123456", pc_endpoint="test_endpoint"
        )
        self.assertEqual(response, (self.EXAMPLE_RESPONSE.get("user_sub"), self.EXAMPLE_RESPONSE.get("process_id")))

    @responses.activate
    def test_valid_400_method(self):
        responses.add(
            responses.POST, "{}/test_endpoint".format(PROCESS_CONTROLLER_HOST), json=self.EXAMPLE_RESPONSE, status=400
        )

        with self.assertRaises(ValidationError):
            pc_service_payment(
                sb_token="sn_12345678", price=100, title="Test_title", order_uid="123456", pc_endpoint="test_endpoint"
            )

    @responses.activate
    def test_valid_400_insufficient_method(self):
        responses.add(
            responses.POST,
            "{}/test_endpoint".format(PROCESS_CONTROLLER_HOST),
            json={"error_type": "INSUFFICIENT_FOUNDS"},
            status=400,
        )

        with self.assertRaises(ValidationError):
            pc_service_payment(
                sb_token="sn_12345678", price=100, title="Test_title", order_uid="123456", pc_endpoint="test_endpoint"
            )

    @responses.activate
    def test_valid_403_method(self):
        responses.add(
            responses.POST, "{}/test_endpoint".format(PROCESS_CONTROLLER_HOST), json=self.EXAMPLE_RESPONSE, status=403
        )

        with self.assertRaises(ValidationError):
            pc_service_payment(
                sb_token="sn_12345678", price=100, title="Test_title", order_uid="123456", pc_endpoint="test_endpoint"
            )

    @responses.activate
    def test_valid_500_method(self):
        responses.add(
            responses.POST, "{}/test_endpoint".format(PROCESS_CONTROLLER_HOST), json=self.EXAMPLE_RESPONSE, status=500
        )

        with self.assertRaises(ValidationError):
            pc_service_payment(
                sb_token="sn_12345678", price=100, title="Test_title", order_uid="123456", pc_endpoint="test_endpoint"
            )

    @responses.activate
    def test_valid_exception_method(self):
        import mock

        responses.add(
            responses.POST, "{}/test_endpoint".format(PROCESS_CONTROLLER_HOST), json=self.EXAMPLE_RESPONSE, status=200
        )

        with mock.patch("services.pc_service.PcService.virtual_shop_payment") as PcMock:
            PcMock.side_effect = Exception()
            with self.assertRaises(ValidationError):
                pc_service_payment(
                    sb_token="sn_12345678",
                    price=100,
                    title="Test_title",
                    order_uid="123456",
                    pc_endpoint="test_endpoint",
                )
