import datetime
import json
import logging
import time
from decimal import Decimal

import fakeredis
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase
from freezegun import freeze_time

from project.common import SecretBox
from virtual_shop import models

logger = logging.getLogger(__name__)


class BasePartnerConfigurationTest(TestCase):
    def create_default_model(self):
        return models.BasePartnerConfiguration.objects.create(name="TestPartnerConfig")

    def test_default_model_creation(self):
        w = self.create_default_model()
        self.assertTrue(isinstance(w, models.BasePartnerConfiguration))
        self.assertEqual(w.name, "TestPartnerConfig")
        self.assertEqual(w.__str__(), "TestPartnerConfig")

    def test_default_model__str__(self):
        self.user = User.objects.create(username="TESTDEFAULTMODEL")
        self.order = models.Order.objects.create(user=self.user, status="NEW")
        self.order_history = models.OrderHistory.objects.create(order=self.order, note="Test Note")
        self.assertEqual(
            self.order_history.__str__(),
            "{}({})".format(self.order_history.__class__.__name__, str(self.order_history.uid)),
        )


class BaseProductTest(TestCase):
    @staticmethod
    def create_base_product_model():
        return models.BaseProduct.objects.create(title="TestProduct", price=100)

    def test_base_product_model_creation(self):
        w = self.create_base_product_model()
        self.assertTrue(isinstance(w, models.BaseProduct))
        self.assertEqual(w.title, "TestProduct")
        self.assertEqual(w.__str__(), "TestProduct")


class SbTechPartnerConfigurationTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.r = fakeredis.FakeStrictRedis()
        cls.w = models.SbTechPartnerConfiguration.objects.create(
            name="Test_Partner", token_prefix="wx_", pc_endpoint="/test_endpoint"
        )
        arn = models.SbTechPartnerConfiguration.get_arn_for_token_prefix("wx_")
        logger.info(arn)
        cls.result = (
            models.SbTechPartnerConfiguration.objects.filter(token_prefix="wx_")
            .values("uid", "name", "token_prefix", "pc_endpoint")
            .first()
        )
        cls.r.set(arn, cls.result)
        logger.info(cls.r.get(arn))

    def test_sbtech_partner_model_creation(self):
        self.assertTrue(isinstance(self.w, models.SbTechPartnerConfiguration))
        self.assertEqual(self.w.pc_endpoint, "/test_endpoint")
        self.assertEqual(self.w.token_prefix, "wx_")
        self.assertEqual(
            self.w.get_arn_for_token_prefix(self.w.token_prefix),
            "virtual_shop:partner_configuration:sb_tech:prefix:wx_",
        )

    def test_sbtech_partner_get_partner_data_creation(self):
        self.assertEqual(models.SbTechPartnerConfiguration.get_partner_data("wx_"), self.result)
        # self.assertTrue(isinstance(w, models.SbTechPartnerConfiguration))
        # self.assertEqual(w.pc_endpoint, '/test_endpoint')
        # self.assertEqual(w.token_prefix, 'sn_')
        # self.assertEqual(
        #     w.get_arn_for_token_prefix(w.token_prefix),
        #     'virtual_shop:partner_configuration:sb_tech:prefix:sn_'
        # )


class ProductTypeTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix=" SN_", pc_endpoint="/test_endpoint"
        )

    def create_product_type_model(self):
        return models.ProductType.objects.create(
            partner_configuration=self.partner_configuration, name="TestProductType", subtype_validation="INT"
        )

    def test_product_type_model_creation(self):
        w = self.create_product_type_model()
        self.assertTrue(isinstance(w, models.ProductType))
        self.assertEqual(w.name, "TestProductType")
        self.assertEqual(w.__str__(), "{}- subtype:{}".format("TestProductType", "INT"))


class ProductTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix=" SN_", pc_endpoint="/test_endpoint"
        )
        product_type_int = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="INT", subtype_validation="INT"
        )
        product_type_decimal = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="DECIMAL", subtype_validation="DECIMAL"
        )
        product_type_string = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="STRING", subtype_validation="CHAR"
        )
        product_type_wrong = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="WRONG", subtype_validation="WRONG"
        )
        cls.model_int = models.Product.objects.create(
            title="test_product", product_type=product_type_int, subtype_raw=10
        )
        cls.model_decimal = models.Product.objects.create(
            title="test_product", product_type=product_type_decimal, subtype_raw=10
        )
        cls.model_string = models.Product.objects.create(
            title="test_product", product_type=product_type_string, subtype_raw="10"
        )
        cls.model_wrong = models.Product.objects.create(
            title="test_product", product_type=product_type_wrong, subtype_raw=10
        )

    def test_product_model_creation(self):
        w = self.model_int
        self.assertTrue(isinstance(w, models.Product))
        self.assertEqual(w.title, "test_product")
        self.assertEqual(w.get_simple_name(), "product")
        self.assertEqual(w.get_subtype(w.product_type.subtype_validation, w.subtype_raw), 10)
        # self.assertEqual(w.clean(), 10)

    def test_product_decimal_model_creation(self):
        w = self.model_decimal
        self.assertEqual(w.get_subtype(w.product_type.subtype_validation, w.subtype_raw), Decimal(10))

    def test_product_string_model_creation(self):
        w = self.model_string
        self.assertEqual(w.get_subtype(w.product_type.subtype_validation, w.subtype_raw), "10")
        # self.assertEqual(w.subtype(), '10')
        # self.assertTrue(w.subtype())

    def test_product_wrong_model_creation(self):
        w = self.model_wrong
        with self.assertRaises(ValueError):
            w.get_subtype(w.product_type.subtype_validation, w.subtype_raw)
        with self.assertRaises(ValidationError):
            w.clean()


class PackageTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix=" SN_", pc_endpoint="/test_endpoint"
        )
        product_type_int = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="INT", subtype_validation="INT"
        )
        cls.model_int = models.Product.objects.create(
            title="test_product", product_type=product_type_int, subtype_raw=10
        )
        cls.package = models.Package.objects.create(package_product=cls.model_int, quantity=5)

    def test_package_model_creation(self):
        w = self.package
        self.assertTrue(isinstance(w, models.Package))
        self.assertEqual(w.get_simple_name(), "package")


class OrderTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.partner_configuration = models.SbTechPartnerConfiguration.objects.create(
            token_prefix=" SN_", pc_endpoint="/test_endpoint"
        )
        product_type_int = models.ProductType.objects.create(
            partner_configuration=cls.partner_configuration, name="INT", subtype_validation="INT"
        )
        cls.model_int = models.Product.objects.create(
            title="test_product", product_type=product_type_int, subtype_raw=10
        )
        cls.user = User.objects.create(username="TEST")
        cls.order = models.Order.objects.create(user=cls.user, status="NEW", checkout_amount=100)

    @freeze_time(datetime.datetime.fromtimestamp(int(time.time())).strftime("%c"))
    def test_package_model_creation(self):
        w = self.order
        status_token_data = {"e": int(time.time()) + 60, "u": "TEST", "o": str(w.uid)}
        status_token_json = json.dumps(status_token_data)
        status_token = SecretBox.encrypt(status_token_json)
        self.assertTrue(isinstance(w, models.Order))
        self.assertEqual(w.__str__(), "Order id:{} - User:{}".format(w.uid, "TEST"))
        self.assertEqual(SecretBox.decrypt(w.status_token), SecretBox.decrypt(status_token))
