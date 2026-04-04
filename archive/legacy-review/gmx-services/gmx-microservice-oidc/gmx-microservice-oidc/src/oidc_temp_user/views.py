from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework import generics

from project.authentication_backends import OidcJsonTokenAuth
from . import serializers
import logging

logger = logging.getLogger(__name__)


class ExternalUserCreateView(DefaultJsonRestViewMixing, generics.CreateAPIView):
    http_method_names = ['post', 'options']
    required_scopes = ('oidc:external_user:write',)
    serializer_class = serializers.ExternalUserMappingModelSerializer
    permission_classes = (TokenHasScope,)
    authentication_classes = (OidcJsonTokenAuth,)

    def dispatch(self, request, *args, **kwargs):
        try:
            return super().dispatch(request, *args, **kwargs)
        except Exception as e:
            logger.exception(e)
            raise e

    def create(self, request, *args, **kwargs):
        result = super().create(request, *args, **kwargs)
        if not result.data.get('created', False):
            result.status_code = 200
        return result


class ExternalUserCreateBulkView(DefaultJsonRestViewMixing, generics.CreateAPIView):
    http_method_names = ['post', 'options']
    required_scopes = ('oidc:external_user:bulk:write',)
    serializer_class = serializers.ExternalUserMappingModelBulkSerializer
    permission_classes = (TokenHasScope,)
    authentication_classes = (OidcJsonTokenAuth,)
