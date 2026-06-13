import random

import factory
from django.conf import settings
from faker_e164.providers import E164Provider

from profiles import models
from profiles.factories.company import CompanyBaseSchemaFactory

factory.Faker.add_provider(E164Provider)


class AddressBaseSchemaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Address

    line_1 = factory.Faker("street_address")
    city = factory.Faker("city")
    post_code = factory.Faker("postcode")
    is_verified = True
    is_primary = True
    is_deleted = False
    user = None


class EmailBaseSchemaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Email

    email = factory.Faker("email")
    is_verified = True
    is_primary = True
    user = None


class PhoneNumberBaseSchemaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Phone

    phone_number = factory.Faker(
        "e164", region_code=settings.PHONE_NUMBERS_WHITELISTED_REGIONS[0], valid=True, possible=True
    )
    is_verified = True
    is_primary = True


class SocialAccountDetailsBaseSchemaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.SocialAccountDetails

    social_account_type = random.choice(models.SocialAccountDetails.SocialTypeChoices.to_choices())[0]
    social_account_id = factory.Faker("random_number", digits=10, fix_len=True)
    social_account_extra = factory.Dict({"role_1": True, "role_2": False})


class UserBaseSchemaFactory(factory.django.DjangoModelFactory):
    username = factory.Faker("user_name")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    originator = None
    is_staff = False
    is_superuser = False
    is_test_user = False


class UserCreateSchemaFactoryWithoutAddress(UserBaseSchemaFactory):
    class Meta:
        model = models.CustomUser

    password = factory.Faker("password", special_chars=True, digits=True, upper_case=True, lower_case=True, length=20)
    email = factory.RelatedFactory(EmailBaseSchemaFactory, factory_related_name="user")
    phone_number = factory.RelatedFactory(PhoneNumberBaseSchemaFactory, factory_related_name="user")
    date_of_birth = None
    date_of_birth_verified = False


class UserCreateSchemaFactoryWithoutEmail(UserBaseSchemaFactory):
    class Meta:
        model = models.CustomUser

    password = factory.Faker("password", special_chars=True, digits=True, upper_case=True, lower_case=True, length=20)
    phone_number = factory.RelatedFactory(PhoneNumberBaseSchemaFactory, factory_related_name="user")
    address = factory.RelatedFactory(AddressBaseSchemaFactory, factory_related_name="user")
    date_of_birth = None
    date_of_birth_verified = False


class UserCreateSchemaFactoryWithoutPhone(UserBaseSchemaFactory):
    class Meta:
        model = models.CustomUser

    password = factory.Faker("password", special_chars=True, digits=True, upper_case=True, lower_case=True, length=20)
    email = factory.RelatedFactory(EmailBaseSchemaFactory, factory_related_name="user")
    address = factory.RelatedFactory(AddressBaseSchemaFactory, factory_related_name="user")
    date_of_birth = None
    date_of_birth_verified = False


class UserCreateSchemaFactory(UserBaseSchemaFactory):
    class Meta:
        model = models.CustomUser

    password = factory.Faker("password", special_chars=True, digits=True, upper_case=True, lower_case=True, length=20)
    email = factory.RelatedFactory(EmailBaseSchemaFactory, factory_related_name="user")
    phone_number = factory.RelatedFactory(PhoneNumberBaseSchemaFactory, factory_related_name="user")
    address = factory.RelatedFactory(AddressBaseSchemaFactory, factory_related_name="user")
    date_of_birth = None
    date_of_birth_verified = False


class UserCreateSchemaDictFactory(UserCreateSchemaFactory):
    class Meta:
        model = dict


class UserCreateSchemaFactoryWithSocial(UserCreateSchemaFactory):
    class Meta:
        model = models.CustomUser

    social_accounts_set = factory.RelatedFactory(SocialAccountDetailsBaseSchemaFactory, factory_related_name="user")


class UserCreateSchemaFactoryCompany(UserBaseSchemaFactory):
    class Meta:
        model = models.CustomUser

    is_company = True
    company = factory.SubFactory(CompanyBaseSchemaFactory)
