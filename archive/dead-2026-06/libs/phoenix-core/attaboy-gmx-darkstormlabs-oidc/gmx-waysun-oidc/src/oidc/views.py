from uuid import uuid4

from aws_rest_default.permissions import TokenHasResourceScope, TokenHasScope
from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator
from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework import generics, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from oidc import models, serializers
from profiles import models as profile_models

from .authentication_backends import OidcJsonTokenAuth
from .management.commands.clear_oidc import clear_oidc


class ClearOidcActionView(DefaultJsonRestViewMixing, views.APIView):
    required_scopes = ("oidc:admin:clear_oidc:write",)
    permission_classes = (TokenHasScope,)
    http_method_names = ["post", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    schema = DefaultGmxSchema(
        tags=["admin - utils"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,),
        example_responses={"example-1": "Removed 0 old tokens and 0 old codes."},
    )

    def post(self, request):
        """
        Method removes old unused tokens and authorization codes with default older than 31 days.
        """
        self.logger.info("Executing call_command(clear_oidc)")
        old_tokens_deleted, old_codes_deleted = clear_oidc()
        msg = f"Removed {old_tokens_deleted} old tokens and {old_codes_deleted} old codes."
        self.logger.info(msg)
        return Response(msg)


class OpenidExtraRetrieveUpdateAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateAPIView):
    required_scopes = ("oidc:admin:openid",)
    serializer_class = serializers.OpenidSerializer
    http_method_names = ["get", "patch", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["admin - openid"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
    )

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        obj = generics.get_object_or_404(queryset)

        return obj

    def get_queryset(self):
        audience = self.request.auth.get("aud")
        qs = models.OidcClientExtra.objects.filter(oidc_client__client_id=audience)
        return qs

    def filter_queryset(self, queryset):
        return queryset


class OpenidExtraSocialSecretsListIView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    required_scopes = ("oidc:admin:openid",)
    serializer_class = serializers.CustomUserSocialSecretSerializer
    http_method_names = ["get", "post", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    schema = DefaultGmxSchema(
        tags=["admin - openid"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_responses={
            "example-1": [
                {
                    "object_id": "ba8a07a8-d2d1-460e-8691-13a50e825ed9",
                    "social_type": "cm",
                    "client_id": "094108bd37f94a8fa96e6ef2c734230f",
                    "client_secret": "f830ed3f10f1491f8ca46c5cb596b4a7",
                }
            ]
        },
        example_requests={
            "example-1": {
                "social_type": profile_models.SocialAccountDetails.SocialTypeChoices.WECHAT,
                "client_id": uuid4().hex,
                "client_secret": uuid4().hex,
            }
        },
    )

    def perform_create(self, serializer):
        audience = self.request.auth.get("aud")
        oidc_client_extra = models.OidcClientExtra.objects.filter(
            oidc_client__client_id=audience,
        ).first()
        if oidc_client_extra is None:
            raise serializers.serializers.ValidationError({self.lookup_url_kwarg: "unable to find Oidc Client Extra"})
        serializer.save(oidc_client_extra=oidc_client_extra)

    def get_queryset(self):
        audience = self.request.auth.get("aud")
        qs = models.SocialSecret.objects.filter(
            oidc_client_extra__oidc_client__client_id=audience,
        )
        return qs

    def filter_queryset(self, queryset):
        return queryset


class OpenidExtraSocialSecretsRUDAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ("oidc:admin:openid",)
    serializer_class = serializers.CustomUserSocialSecretSerializer
    http_method_names = ["get", "patch", "delete", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    lookup_url_kwarg = "social_account_type"

    schema = DefaultGmxSchema(
        tags=["admin - openid"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_responses={
            "example-1": {
                "social_type": profile_models.SocialAccountDetails.SocialTypeChoices.WECHAT,
                "client_id": uuid4().hex,
                "client_secret": uuid4().hex,
            }
        },
    )

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())

        obj = generics.get_object_or_404(queryset, social_type=self.kwargs.get(self.lookup_url_kwarg))
        return obj

    def get_queryset(self):
        audience = self.request.auth.get("aud")
        qs = models.SocialSecret.objects.filter(
            oidc_client_extra__oidc_client__client_id=audience,
        )
        return qs

    def filter_queryset(self, queryset):
        return queryset


class ExternalMappingRetrieveView(DefaultJsonRestViewMixing, generics.GenericAPIView):
    serializer_class = serializers.ExternalUserMappingSerializer
    http_method_names = ["get"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (IsAuthenticated, TokenHasScope)
    required_scopes = ("oidc:admin:external_user_mapping:write",)

    def get(self, request, *args, **kwargs):
        external_user_id = self.request.query_params.get("external_user_id", None)
        email = self.request.query_params.get("email", None)
        username = self.request.query_params.get("username", None)
        phone_number = self.request.query_params.get("phone_number", None)
        filtering = dict(external_user_id=external_user_id, email=email, username=username, phone_number=phone_number)
        serializer: serializers.ExternalUserMappingSerializer = self.get_serializer(data=filtering)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
