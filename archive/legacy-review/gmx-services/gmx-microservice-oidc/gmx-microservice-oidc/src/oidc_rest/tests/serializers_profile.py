import factory
import faker
import phonenumbers
from django.test.testcases import TestCase
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from oidc_rest.serializers import profile as profile_serializers
from profiles import models as profile_models
from profiles.tests.factory import CustomUserFactory, EmailFactory, PhoneFactory, AddressFactory

fake = faker.Faker('en_GB')


# noinspection PyUnresolvedReferences,PyAttributeOutsideInit
class CommonSerializerTestCaseMixing(object):
    serializer_class = None
    model_factory = None
    model_class = None

    update_field = None
    update_field_function = None

    # noinspection PyPep8Naming
    def setUp(self):
        self.user = CustomUserFactory()
        self.request = APIRequestFactory().post('')
        self.request.user = self.user

    def test_simple_create(self):
        data = factory.build(dict, FACTORY_CLASS=self.model_factory, user=self.user)
        serializer = self.serializer_class(data=data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        self.assertTrue(self.model_class.objects.filter(id=instance.id).exists())

    def test_set_primary_on_unverified(self):
        instance = self.model_factory()
        data = self.serializer_class(instance=instance).data
        self.assertFalse(data['is_primary'])
        self.assertFalse(data['is_verified'])
        data['is_primary'] = True

        serializer = self.serializer_class(data=data, instance=instance, context={'request': self.request})
        serializer.is_valid(raise_exception=True)

        with self.assertRaises(serializers.ValidationError):
            serializer.save()

    def test_set_primary_on_verified(self):
        instance = self.model_factory()
        instance.set_verified()
        data = self.serializer_class(instance=instance).data
        self.assertFalse(data['is_primary'])
        self.assertTrue(data['is_verified'])
        data['is_primary'] = True

        serializer = self.serializer_class(data=data, instance=instance, context={'request': self.request})
        serializer.is_valid(raise_exception=True)

        instance = serializer.save()
        self.assertTrue(instance.is_primary)

    def test_update_field(self):
        instance = self.model_factory()
        data = self.serializer_class(instance=instance).data
        self.assertFalse(data['is_primary'])
        self.assertFalse(data['is_verified'])

        data[self.update_field] = self.update_field_function()

        serializer = self.serializer_class(data=data, instance=instance, context={'request': self.request})
        serializer.is_valid(raise_exception=True)

        instance = serializer.save()
        self.assertEqual(getattr(instance, self.update_field), data[self.update_field])

    def test_set_verified_must_be_ignored(self):
        instance = self.model_factory()
        data = self.serializer_class(instance=instance).data
        self.assertFalse(data['is_primary'])
        self.assertFalse(data['is_verified'])
        data['is_verified'] = True

        serializer = self.serializer_class(data=data, instance=instance, context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        self.assertFalse(instance.is_verified)
        self.assertFalse(self.model_class.objects.get(pk=instance.pk).is_verified)


class EmailSerializerTestCase(CommonSerializerTestCaseMixing, TestCase):
    serializer_class = profile_serializers.EmailSerializer
    model_factory = EmailFactory
    model_class = profile_models.Email
    update_field = 'email'
    update_field_function = fake.email

    def test_simple_create(self):
        # should be done by AddEmailSerializer
        with self.assertRaises(NotImplementedError):
            super().test_simple_create()


class PhoneSerializerTestCase(CommonSerializerTestCaseMixing, TestCase):
    serializer_class = profile_serializers.PhoneSerializer
    model_factory = PhoneFactory
    model_class = profile_models.Phone
    update_field = 'phone_number'

    def update_field_function(self):
        while True:
            x = fake.phone_number()
            try:
                ph = phonenumbers.parse(x, 'gb')
            except phonenumbers.NumberParseException:
                continue
            if phonenumbers.is_valid_number(ph):
                return phonenumbers.format_number(ph, phonenumbers.PhoneNumberFormat.E164)


class AddressSerializerTestCase(CommonSerializerTestCaseMixing, TestCase):
    serializer_class = profile_serializers.AddressSerializer
    model_factory = AddressFactory
    model_class = profile_models.Address
    update_field = 'line_1'
    update_field_function = fake.street_address
