from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.views import DefaultJsonRestViewMixing
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, metadata
from rest_framework.exceptions import ValidationError

from oidc_rest.serializers.profile import EmailSerializer, PhoneSerializer, AddressSerializer, CompanySerializer, ProfileSerializer, UserLastSeenSerializer
from profiles import models
from project.authentication_backends import OidcJsonTokenAuth


class EmailRetrieveUpdateDestroyAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ('oidc:email',)
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'options']
    serializer_class = EmailSerializer
    authentication_classes = (OidcJsonTokenAuth,)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        try:
            super().perform_destroy(instance)
        except DjangoValidationError as e:
            raise ValidationError({'non_field_errors': e.messages})

    def get_queryset(self):
        return self.request.user.emails.all()


class PhoneListCreateAPIView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    required_scopes = ('oidc:phone',)
    serializer_class = PhoneSerializer
    http_method_names = ['get', 'post', 'options']
    authentication_classes = (OidcJsonTokenAuth,)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.request.user.phones.all()


class PhoneRetrieveUpdateDestroyAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ('oidc:phone',)
    serializer_class = PhoneSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'options']
    authentication_classes = (OidcJsonTokenAuth,)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        try:
            super().perform_destroy(instance)
        except DjangoValidationError as e:
            raise ValidationError({'non_field_errors': e.messages})

    def get_queryset(self):
        return self.request.user.phones.all()


class AddressListCreateAPIView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    required_scopes = ('oidc:address',)
    serializer_class = AddressSerializer
    http_method_names = ['get', 'post', 'options']
    authentication_classes = (OidcJsonTokenAuth,)
    metadata_class = metadata.SimpleMetadata

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.request.user.addresses.all()


class AddressRetrieveUpdateDestroyAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ('oidc:address',)
    serializer_class = AddressSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'options']
    authentication_classes = (OidcJsonTokenAuth,)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        try:
            super().perform_destroy(instance)
        except DjangoValidationError as e:
            raise ValidationError({'non_field_errors': e.messages})

    def get_queryset(self):
        return self.request.user.addresses.all()


class CompanyRetrieveAPIView(DefaultJsonRestViewMixing, generics.RetrieveAPIView):
    required_scopes = ('oidc:company',)
    serializer_class = CompanySerializer
    http_method_names = ['get', 'options']
    authentication_classes = (OidcJsonTokenAuth,)

    def get_queryset(self):
        return models.Company.objects.all()


class ProfileRetrieveUpdateAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateAPIView):
    required_scopes = ('oidc:profile',)
    serializer_class = ProfileSerializer
    http_method_names = ['get', 'put', 'patch', 'options']
    authentication_classes = (OidcJsonTokenAuth,)
    metadata_class = metadata.SimpleMetadata

    def get_object(self):
        return self.request.user

    def get_queryset(self):
        return models.CustomUser.objects.filter(id=self.request.user.id)


class UpdateUsersLastSeenView(DefaultJsonRestViewMixing, generics.CreateAPIView):
    required_scopes = ('oidc:profile:last_seen:write',)
    serializer_class = UserLastSeenSerializer
    permission_classes = (TokenHasScope,)
    http_method_names = ['post', 'options']
    authentication_classes = (OidcJsonTokenAuth,)


