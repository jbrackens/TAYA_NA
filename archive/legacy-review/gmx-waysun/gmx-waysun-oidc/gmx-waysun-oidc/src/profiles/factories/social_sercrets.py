import random
from uuid import uuid4

import factory
from faker_e164.providers import E164Provider

from oidc.models import OidcClientExtra, SocialSecret

factory.Faker.add_provider(E164Provider)


class SocialSecretBaseSchemaFactory(factory.django.DjangoModelFactory):
    oidc_client_extra = OidcClientExtra
    social_type = random.choices(SocialSecret.SocialTypeChoices.choices)[0][0]
    client_id = uuid4().hex
    client_secret = uuid4().hex
    is_deleted = False

    class Meta:
        model = SocialSecret
