import factory
from aws_rest_default.factory import FullCleanDjangoModelFactory
from oidc_provider.models import Client

from oidc import models
from profiles.tests.factory import CustomUserCompanyFactory


class GroupNodeFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = models.GroupNode

    name = factory.Faker('text', 'en', max_nb_chars=20)


class PermissionNodeFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = models.PermissionNode

    name = factory.Faker('text', 'en', max_nb_chars=20)
    description = factory.Faker('text', 'en', max_nb_chars=99)
    parent = factory.SubFactory(GroupNodeFactory)


class OidcClientFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = Client

    name = factory.Faker('company', 'en')
    client_type = 'public'
    client_id = factory.Faker('random_number', 'en', digits=6)
    # client_secret = factory.Faker('password', 'en', length=32, special_chars=False)
    response_type = 'id_token'
    reuse_consent = True
    require_consent = False
    redirect_uris = ['http://localhost:10000']
    post_logout_redirect_uris = ['http://localhost:10000/logout']


class OidcClientExtraFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = models.OidcClientExtra

    oidc_client = factory.SubFactory(OidcClientFactory)
    user = factory.SubFactory(CustomUserCompanyFactory)

    @factory.post_generation
    def default_permissions(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for perm in extracted:
                self.default_permissions.add(perm)

    @factory.post_generation
    def limited_permissions(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for perm in extracted:
                self.limited_permissions.add(perm)


class SocialSecretFactory(FullCleanDjangoModelFactory):
    class Meta:
        model = models.SocialSecret

    oidc_client_extra = factory.SubFactory(OidcClientExtraFactory)
    social_type = factory.Faker('random_element', 'en', elements=['fb', 'tw', 'g+'])
    client_id = factory.Faker('password', 'en', length=60, special_chars=False, upper_case=False)
    client_secret = factory.Faker('password', 'en', length=30)
