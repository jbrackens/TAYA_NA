import datetime
import json
import logging
import time
from unittest import TestCase, mock

import responses
from django.conf import settings
from django.contrib.auth.models import User
from django.test import Client
from django.urls import NoReverseMatch, reverse
from faker import Faker
from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APIRequestFactory, RequestsClient

from project.common import SecretBox
from project.factories import RmxUsernameProvider
from services.pc_service import PcService
from virtual_shop import models

fake = Faker("en")
fake.add_provider(RmxUsernameProvider)


# initialize the APIClient app
logger = logging.getLogger(__name__)
client = Client()
rest_client = RequestsClient()
factory = APIRequestFactory()

FAKE_ID_TOKEN = "FAKE_ID_TOKEN"
FAKE_EXPIRES_IN = 15


class ProductsViewTest(TestCase):
    """Test module for Get all Products"""

    def test_invalid_method(self):
        response = client.get(reverse("virtual_shop:products"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"sb_token": ["Missing param"]})

    def test_invalid_sb_token_method(self):
        response = client.get("/virtual_shop/products?sb_token=wq_")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"sb_token": ["Wrong value"]})

    def test_valid_method(self):
        self.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix="sn_", pc_endpoint="/test_endpoint"
        )
        self.product_type_int = models.ProductType.objects.create(
            partner_configuration=self.partner_configuration, name="INT", subtype_validation="INT"
        )
        self.model_int = models.Product.objects.create(
            title="test_product", product_type=self.product_type_int, subtype_raw=10
        )
        response = rest_client.get("{}/virtual_shop/products?sb_token=sn_1234".format(settings.SITE_URL))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class PcOrderViewTest(TestCase):
    """Test module for Pc Order View"""

    def setUp(self):
        self.fake_user_sub = fake.rmx_username()
        self.fake_user = User.objects.create(username=self.fake_user_sub)

    def tearDown(self):
        models.Product.objects.all().delete()
        models.ProductType.objects.all().delete()
        models.SbTechPartnerConfiguration.objects.all().delete()
        models.Order.objects.all().delete()
        User.objects.all().delete()

    def test_bad_request_method(self):
        response = rest_client.patch(
            "{}/virtual_shop/pc/order/123244".format(settings.SITE_URL),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_valid_request_method(self):
        self.user = User.objects.create(username="TESTPcOrder")
        self.order = models.Order.objects.create(user=self.user, status="NEW", checkout_amount=100, process_id=123456)
        with mock.patch("aws_rest_default.authentication.JSONWebTokenAuthentication.authenticate") as mocked:
            mocked.return_value = (self.fake_user, dict())
            with mock.patch("aws_rest_default.permissions.TokenHasScope.has_permission") as permission_mock:
                permission_mock.return_value = True
                response = rest_client.patch(
                    "{}/virtual_shop/pc/order/123456".format(settings.SITE_URL),
                    headers={"Authorization": "Bearer EXAMPLE_TOKEN"},
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_request_method(self):
        with mock.patch("aws_rest_default.authentication.JSONWebTokenAuthentication.authenticate") as mocked:
            mocked.return_value = (self.fake_user, dict())
            with mock.patch("aws_rest_default.permissions.TokenHasScope.has_permission") as permission_mock:
                permission_mock.return_value = True
                response = rest_client.get(
                    "{}/virtual_shop/pc/order/123456".format(settings.SITE_URL),
                    headers={"Authorization": "Bearer EXAMPLE_TOKEN"},
                )

                self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class OrderViewTest(TestCase):
    """Test module for Order View"""

    def setUp(self):
        self.fake_user_sub = fake.rmx_username()
        responses.add(
            responses.POST,
            settings.OIDC_AUTHENTICATION_URL,
            json={"id_token": FAKE_ID_TOKEN, "expires_in": FAKE_EXPIRES_IN},
            status=200,
        )

    def tearDown(self):
        models.Product.objects.all().delete()
        models.ProductType.objects.all().delete()
        models.SbTechPartnerConfiguration.objects.all().delete()
        models.Order.objects.all().delete()

    def test_invalid_method(self):
        response = client.get(reverse("virtual_shop:orders"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"sb_token": ["Missing param"]})

    @responses.activate
    def test_valid_method(self):
        self.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix="sn_", pc_endpoint="/test_endpoint"
        )
        self.product_type_int = models.ProductType.objects.create(
            partner_configuration=self.partner_configuration, name="INT", subtype_validation="INT"
        )
        self.product = models.Product.objects.create(title="TestProduct", product_type=self.product_type_int, price=100)
        self.user = User.objects.create(username="TESTOrder")
        self.order = models.Order.objects.create(user=self.user, status="NEW", checkout_amount=100)

        responses.add(
            responses.POST, PcService.ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO, json={"user_sub": "TESTOrder"}, status=200
        )
        response = rest_client.get("{}/virtual_shop/orders?sb_token=sn_12345678".format(settings.SITE_URL))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual((response.json().get("results"))[0].get("order_id"), str(self.order.uid))
        self.assertEqual((response.json().get("results"))[0].get("checkout_amount"), "100.00000000")


class OrderDetailViewTest(TestCase):
    """Test module for Order View"""

    def tearDown(self):
        models.Product.objects.all().delete()
        models.ProductType.objects.all().delete()
        models.SbTechPartnerConfiguration.objects.all().delete()
        models.Order.objects.all().delete()

    def test_invalid_reverse_method(self):
        with self.assertRaises(NoReverseMatch):
            response = client.get(reverse("virtual_shop:order_details"))

    def test_bad_request_method(self):
        response = client.get(reverse("virtual_shop:order_details", args={"status_token11": "1231231"}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_value_error(self):
        with mock.patch("virtual_shop.views.OrderDetailsView") as OrderMock:
            OrderMock.side_effect = ValueError()
            response = client.get(reverse("virtual_shop:order_details", args={"status_token": "1231231"}))
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @freeze_time(datetime.datetime.fromtimestamp(int(time.time())).strftime("%c"))
    def get_status_token(self):
        self.user = User.objects.create(username="TESTDetails")
        self.order = models.Order.objects.create(user=self.user, status="NEW", checkout_amount=100)
        w = self.order
        status_token_data = {"e": int(time.time()) + 60, "u": "TESTDetails", "o": str(w.uid)}
        status_token_json = json.dumps(status_token_data)
        status_token = SecretBox.encrypt(status_token_json)
        return status_token, w

    def test_valid_method(self):
        status_token, w = self.get_status_token()
        response = client.get(reverse("virtual_shop:order_details", args={status_token}))

        self.assertEqual(response.json().get("order_id"), str(w.uid))
        self.assertEqual(response.json().get("checkout_amount"), "100.00000000")

    @freeze_time(datetime.datetime.fromtimestamp(int(time.time())).strftime("%c"))
    def get_expired_status_token(self):
        self.user = User.objects.create(username="TESTInvalid")
        self.order = models.Order.objects.create(user=self.user, status="NEW", checkout_amount=100)
        w = self.order
        status_token_data = {"e": int(time.time()) - 1000, "u": "TESTInvalid", "o": str(w.uid)}
        status_token_json = json.dumps(status_token_data)
        status_token = SecretBox.encrypt(status_token_json)
        return status_token, w

    def test_expired_status_token_method(self):
        status_token, w = self.get_expired_status_token()
        response = client.get(reverse("virtual_shop:order_details", args={status_token}))
        self.assertEqual(response.status_code, 403)


class PurchasedProductsViewTest(TestCase):
    """Test module for Order View"""

    def setUp(self):
        self.fake_user_sub = fake.rmx_username()
        self.fake_user = User.objects.create(username=self.fake_user_sub)

    def tearDown(self):
        models.Product.objects.all().delete()
        models.ProductType.objects.all().delete()
        models.SbTechPartnerConfiguration.objects.all().delete()
        models.Order.objects.all().delete()
        User.objects.all().delete()

    def test_bad_request_method(self):
        response = client.get(reverse("virtual_shop:purchased"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_valid_request_method(self):
        with mock.patch("aws_rest_default.authentication.JSONWebTokenAuthentication.authenticate") as mocked:
            mocked.return_value = (self.fake_user, dict())
            with mock.patch("aws_rest_default.permissions.TokenHasScope.has_permission") as permission_mock:
                permission_mock.return_value = True
                response = rest_client.get(
                    "{}/virtual_shop/purchased".format(settings.SITE_URL),
                    headers={"Authorization": "Bearer EXAMPLE_TOKEN"},
                )

                self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_time_method(self):
        with mock.patch("aws_rest_default.authentication.JSONWebTokenAuthentication.authenticate") as mocked:
            mocked.return_value = (self.fake_user, dict())
            with mock.patch("aws_rest_default.permissions.TokenHasScope.has_permission") as permission_mock:
                permission_mock.return_value = True
                response = rest_client.get(
                    "{}/virtual_shop/purchased?date=cnekfnelkfn".format(settings.SITE_URL),
                    headers={"Authorization": "Bearer EXAMPLE_TOKEN"},
                )

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_time_method(self):
        with mock.patch("aws_rest_default.authentication.JSONWebTokenAuthentication.authenticate") as mocked:
            mocked.return_value = (self.fake_user, dict())
            with mock.patch("aws_rest_default.permissions.TokenHasScope.has_permission") as permission_mock:
                permission_mock.return_value = True
                response = rest_client.get(
                    "{}/virtual_shop/purchased?date=2018-10-02".format(settings.SITE_URL),
                    headers={"Authorization": "Bearer EXAMPLE_TOKEN"},
                )

                self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_request_post_method(self):
        with mock.patch("aws_rest_default.authentication.JSONWebTokenAuthentication.authenticate") as mocked:
            mocked.return_value = (self.fake_user, dict())
            with mock.patch("aws_rest_default.permissions.TokenHasScope.has_permission") as permission_mock:
                permission_mock.return_value = True
                response = rest_client.post(
                    "{}/virtual_shop/purchased".format(settings.SITE_URL),
                    headers={"Authorization": "Bearer EXAMPLE_TOKEN"},
                )

                self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
