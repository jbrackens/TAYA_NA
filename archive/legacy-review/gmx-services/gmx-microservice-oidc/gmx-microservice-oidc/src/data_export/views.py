from aws_rest_default.permissions import TokenHasScope
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from oidc_rest.serializers.profile import ProfileSerializer
from oidc_temp_user.models import ExternalUserMappingModel
from aws_rest_default.views import DefaultJsonRestViewMixing
from django_filters import rest_framework as filters
from profiles.models import CustomUser
from project.authentication_backends import OidcJsonTokenAuth
from . import serializers
from .filters import ExternalUserMappingModelFilter, CustomUserModelFilter


class ListExternalUserMappingModelListApiView(DefaultJsonRestViewMixing, ListAPIView):
    queryset = ExternalUserMappingModel.objects.all()
    required_scopes = ('oidc:data_export:ext_user_mapping:read',)
    permission_classes = (TokenHasScope,)
    serializer_class = serializers.ExternalUserMappingModelSerializer
    filter_backends = (filters.DjangoFilterBackend,)
    filter_class = ExternalUserMappingModelFilter
    authentication_classes = (OidcJsonTokenAuth,)

    def get_queryset(self):
        query = super().get_queryset()
        query = query.values(
            'company_id',
            'company__name1',
            'company__name2',
            'external_user_id',
            'user__sub',
            'user__last_login',
            'user__originator__company__pk'
        )
        return query


class ListCustomUserListApiView(DefaultJsonRestViewMixing, ListAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = ProfileSerializer
    required_scopes = ('oidc:data_export:custom_user:read',)
    permission_classes = (TokenHasScope,)
    filter_backends = (filters.DjangoFilterBackend,)
    filter_class = CustomUserModelFilter
    authentication_classes = (OidcJsonTokenAuth,)

    def get_queryset(self):
        query = super().get_queryset()
        query = query.select_related(
            'company',
            'originator',
            'originator__company',
        )
        return query

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        return qs[:50]
