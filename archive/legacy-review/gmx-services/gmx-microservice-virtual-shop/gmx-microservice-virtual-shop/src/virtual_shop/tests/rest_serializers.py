import logging
from unittest import mock

import responses
from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase
from faker import Faker
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from project.factories import RmxUsernameProvider
from services.factories import FakeRequest
from virtual_shop import models
from virtual_shop.serializers import BaseProductSerializer, PaymentRequestSerializer, PurchasedSerializer

FAKE_ID_TOKEN = "FAKE_ID_TOKEN"
FAKE_EXPIRES_IN = 15

logger = logging.getLogger(__name__)

fake = Faker("en")
fake.add_provider(RmxUsernameProvider)


class BaseProductSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.request = FakeRequest()
        cls.serializer_context = {"request": cls.request}
        cls.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix="sn_", pc_endpoint="/test_endpoint"
        )
        cls.product_type_int = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="INT", subtype_validation="INT"
        )
        cls.model_int = models.Product.objects.create(
            title="test_product",
            description="TEST_PRODUCT",
            product_type=cls.product_type_int,
            subtype_raw=10,
            is_visible=True,
            is_active=True,
        )
        cls.model_int = models.Product.objects.create(
            title="test_product2",
            description="TEST_PRODUCT2",
            product_type=cls.product_type_int,
            subtype_raw=10,
            is_visible=True,
            is_active=True,
        )

    def setUp(self):
        self.user_sub = fake.rmx_username()

    @responses.activate
    def test_get_product(self):

        queryset = models.Product.objects.all().values()
        logger.info(queryset)
        simple_product_serializer = BaseProductSerializer(
            data=list(queryset), context=self.serializer_context, many=True
        )
        logger.info(simple_product_serializer)
        simple_product_serializer.is_valid(raise_exception=True)
        with self.assertRaises(AttributeError):
            simple_product_serializer.to_representation(queryset)


class PaymentRequestSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.fake_user_sub = fake.rmx_username()
        cls.request = FakeRequest()
        cls.serializer_context = {"request": cls.request}
        cls.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix="tt_", pc_endpoint="test_endpoint", name="TestNAtion"
        )
        cls.product_type_int = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="INT", subtype_validation="INT"
        )
        cls.model_int = models.Product.objects.create(
            title="test_product",
            description="TEST_PRODUCT",
            product_type=cls.product_type_int,
            subtype_raw=10,
            is_visible=True,
            is_active=True,
        )
        cls.model_int2 = models.Product.objects.create(
            title="test_product2",
            description="TEST_PRODUCT2",
            product_type=cls.product_type_int,
            subtype_raw=10,
            is_visible=True,
            is_active=True,
        )
        cls.order = models.Order.objects.create()
        cls.user = User.objects.create(username="TEST")
        cls.data = {
            "sb_token": "tt_1234",
            "order_lines": [
                {"product_id": str(cls.model_int.uid), "quantity": 1},
                {"product_id": str(cls.model_int2.uid), "quantity": 1},
            ],
        }
        responses.add(
            responses.POST,
            settings.OIDC_AUTHENTICATION_URL,
            json={"id_token": FAKE_ID_TOKEN, "expires_in": FAKE_EXPIRES_IN},
            status=200,
        )
        cls.EXAMPLE_RESPONSE = {
            "process_id": fake.rmx_company_id(),
            "external_user_id": fake.numerify("########"),
            "email": fake.email(),
            "first_name": fake.user_name(),
            "user_sub": cls.fake_user_sub,
        }

    def test_invalid_update_method(self):
        validated_data = {}
        with self.assertRaises(TypeError):
            PaymentRequestSerializer().update(self.serializer_context, validated_data)

    def test_update_order_model_method(self):
        update_order = PaymentRequestSerializer().update_order_model(
            order=self.order, user=self.user, process_id="12345678", checkout_amount=1000
        )
        self.assertEqual(update_order.uid, self.order.uid)
        self.assertEqual(update_order.process_id, "12345678")

    def test_invalid_order_update_method(self):
        with self.assertRaises(serializers.ValidationError):
            PaymentRequestSerializer().update_order_model(
                order=self.model_int, user=self.user, process_id="12345678", checkout_amount=1000
            )

    def test_invalid_validation_order_update_method(self):
        with self.assertRaises(serializers.ValidationError):
            PaymentRequestSerializer().update_order_model(
                order=self.order, user=self.user, process_id=100, checkout_amount="dsdghgh"
            )

    def test_invalid_method_chectout_zero(self):
        serializer = PaymentRequestSerializer(
            data=[self.data],
            many=True,
            context=self.serializer_context,
        )
        serializer.is_valid(raise_exception=True)
        logger.info(serializer.data)
        with self.assertRaises(ValidationError):
            serializer.save()

    def test_invalid_sb_token(self):
        serializer = PaymentRequestSerializer(
            data=[{"sb_token": "12345467", "order_lines": []}],
            many=True,
            context=self.serializer_context,
        )
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    @responses.activate
    def test_valid_serializer(self):
        responses.add(
            responses.POST,
            "{}/test_endpoint".format(settings.PROCESS_CONTROLLER_HOST),
            json=self.EXAMPLE_RESPONSE,
            status=200,
        )
        price = 100
        products_for_update = models.BaseProduct.objects.all().select_for_update().first()
        products_for_update.price = price
        products_for_update.save(update_fields=("price",))

        self.model_int.price = 100
        self.model_int2.price = 200
        serializer = PaymentRequestSerializer(
            data=[self.data],
            many=True,
            context=self.serializer_context,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info(serializer.data)
        self.assertEqual(serializer.data[0].get("status"), "NEW")

    def test_invalid_products(self):
        serializer = PaymentRequestSerializer(
            data=[
                {
                    "sb_token": "tt_1234",
                    "order_lines": [
                        {"product_id": "INVALID_UID", "quantity": 1},
                        {"product_id": "INVALID_UID", "quantity": 1},
                    ],
                }
            ],
            many=True,
            context=self.serializer_context,
        )
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_invalid_order_lines(self):
        serializer = PaymentRequestSerializer(
            data=[
                {
                    "sb_token": "tt_1234",
                    "order_lines": [
                        {"product_id": str(self.model_int.uid), "quantity": "fgggdddd"},
                        {"product_id": str(self.model_int2.uid), "quantity": 1},
                    ],
                }
            ],
            many=True,
            context=self.serializer_context,
        )
        serializer.is_valid(raise_exception=True)
        with self.assertRaises(ValidationError):
            serializer.save()

    def test_exception_order_lines(self):
        serializer = PaymentRequestSerializer(
            data=[
                {
                    "sb_token": "tt_1234",
                    "order_lines": [
                        {"product_id": str(self.model_int.uid), "quantity": 20},
                        {"product_id": str(self.model_int2.uid), "quantity": 1},
                    ],
                }
            ],
            many=True,
            context=self.serializer_context,
        )
        serializer.is_valid(raise_exception=True)
        with mock.patch("virtual_shop.serializers.PaymentRequestSerializer.create") as Mock:
            Mock.side_effect = ValidationError()
            with self.assertRaises(ValidationError):
                serializer.save()


class PurchasedSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.request = FakeRequest()
        cls.serializer_context = {"request": cls.request}
        cls.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix="sn_", pc_endpoint="/test_endpoint"
        )
        cls.product_type_int = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="INT", subtype_validation="INT"
        )
        cls.model_int = models.Product.objects.create(
            title="test_product",
            description="TEST_PRODUCT",
            product_type=cls.product_type_int,
            subtype_raw=10,
            is_visible=True,
            is_active=True,
        )
        cls.model_int2 = models.Product.objects.create(
            title="test_product2",
            description="TEST_PRODUCT2",
            product_type=cls.product_type_int,
            subtype_raw=10,
            is_visible=True,
            is_active=True,
        )
        cls.package = models.Package.objects.create(package_product=cls.model_int2, quantity=20)
        cls.user = User.objects.create(username="TEST")
        cls.order = models.Order.objects.create(
            status="NEW",
            user=cls.user,
        )
        cls.order_line = models.OrderLines.objects.create(
            order=cls.order, base_product=cls.model_int, quantity=1, price=100
        )
        cls.order_line2 = models.OrderLines.objects.create(
            order=cls.order, base_product=cls.package, quantity=3, price=1000
        )
        cls.order.status = "SUCCESS"
        cls.purchased = models.PurchasedProductsModel.objects.create(
            user=cls.user, order=cls.order, base_product=cls.model_int, quantity=1
        )
        cls.purchased2 = models.PurchasedProductsModel.objects.create(
            user=cls.user, order=cls.order, base_product=cls.package, quantity=3
        )

    def test_purchased_serializer(self):
        queryset = models.PurchasedProductsModel.objects.all()
        queryset = queryset.values(
            "user__username",
            "created_at",
            "order__uid",
            "base_product__product__uid",
            "base_product__product__title",
            "base_product__product__product_type__name",
            "base_product__product__product_type__subtype_validation",
            "base_product__product__subtype_raw",
            "base_product__product__product_type__partner_configuration__name",
            "base_product__package__uid",
            "base_product__package__title",
            "base_product__package__quantity",
            "base_product__package__package_product__product_type__name",
            "base_product__package__package_product__product_type__subtype_validation",
            "base_product__package__package_product__subtype_raw",
            "base_product__package__package_product__product_type__partner_configuration__name",
        )

        serializer = PurchasedSerializer(
            queryset,
            many=True,
            context=self.serializer_context,
        )
        self.assertEqual(serializer.data[0].get("username"), self.user.username)
        self.assertEqual(serializer.data[0].get("order_id"), str(self.order.uid))
        self.assertEqual(serializer.data[0].get("purchased_item").get("uid"), str(self.model_int.uid))
        self.assertEqual(serializer.data[1].get("purchased_item").get("uid"), str(self.package.uid))
