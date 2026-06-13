from uuid import uuid4

import factory
from faker_e164.providers import E164Provider

from profiles import models

factory.Faker.add_provider(E164Provider)


class CompanyBaseSchemaFactory(factory.django.DjangoModelFactory):
    sub = uuid4()
    name1 = factory.Faker("first_name")

    class Meta:
        model = models.Company
