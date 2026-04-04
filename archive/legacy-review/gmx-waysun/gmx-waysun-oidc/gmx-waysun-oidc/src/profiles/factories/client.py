import factory
from faker_e164.providers import E164Provider
from oidc_provider.models import Client

factory.Faker.add_provider(E164Provider)


class ClientBaseSchemaFactory(factory.django.DjangoModelFactory):
    name = factory.Faker("first_name")
    client_id = 111111

    class Meta:
        model = Client
