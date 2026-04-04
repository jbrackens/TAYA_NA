import factory
import faker
import phonenumbers
import pytz
from aws_rest_default.factory import FullCleanDjangoModelFactory

from profiles import models

fake = faker.Faker('en_GB')


class AbstractAddressFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = models.AbstractAddressModel

    country = 'uk'
    line_1 = factory.Faker('street_address', 'en')
    line_2 = factory.Faker('military_apo', 'en')
    city = factory.Faker('city', 'en')
    post_code = factory.Faker('postalcode', 'en')
    region = factory.Faker('state')


class CompanyFactory(AbstractAddressFactory):
    class Meta:
        model = models.Company

    name1 = factory.Faker('company', 'en')
    name2 = factory.Faker('company', 'en')
    website = factory.Faker('url', 'en')


class CustomUserFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = models.CustomUser

    username = factory.Faker('user_name', 'en')
    password = '123flipadmin#@!'

    @factory.post_generation
    def set_password(self, *arg, **kwargs):
        self.set_password(self.password)

    @factory.post_generation
    def oidc_permissions(self, create, extracted, **kwargs):
        if create and extracted:
            self.oidc_permissions.set(extracted)

    @factory.post_generation
    def email(self, create, extracted, **kwargs):
        if not extracted:
            extracted = fake.email()

        if create:
            email = EmailFactory(email=extracted, user=self)
            email.is_verified = False
            email.is_primary = True
            email.save()

    first_name = factory.Faker('first_name', 'en')
    middle_name = factory.Faker('first_name', 'en')
    last_name = factory.Faker('last_name', 'en')

    date_of_birth = factory.Faker('date_time_between', 'en', start_date='-60y', end_date='-30y')
    date_of_birth_verified = factory.Faker('boolean', 'en')

    gender = factory.Faker('random_element', 'en', elements=['M', 'F', 'U'])
    timezone = factory.Faker('random_element', 'en', elements=pytz.common_timezones)

    originator = factory.SubFactory('profiles.tests.factory.CustomUserCompanyFactory')
    is_company = False
    company = None
    is_staff = False
    is_active = True
    is_limited = True


class CustomUserCompanyFactory(CustomUserFactory):
    class Meta:
        model = models.CustomUser

    originator = None
    is_company = True
    company = factory.SubFactory(CompanyFactory)


class AddressFactory(AbstractAddressFactory):
    class Meta:
        model = models.Address

    user = factory.SubFactory(CustomUserFactory)
    is_verified = False
    is_primary = False


class EmailFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = models.Email

    user = factory.SubFactory(CustomUserFactory)
    email = factory.Faker('email', 'en')
    is_verified = False
    is_primary = False


def get_random_valid_number():
    while True:
        ph = fake.phone_number()
        if ph.startswith('+44'):
            ph = phonenumbers.parse(ph, 'gb')
            if phonenumbers.is_valid_number(ph):
                return phonenumbers.format_number(ph, phonenumbers.PhoneNumberFormat.E164)


class PhoneFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = models.Phone

    user = factory.SubFactory(CustomUserFactory)
    phone_number = factory.LazyFunction(get_random_valid_number)
    is_verified = False
    is_primary = False
