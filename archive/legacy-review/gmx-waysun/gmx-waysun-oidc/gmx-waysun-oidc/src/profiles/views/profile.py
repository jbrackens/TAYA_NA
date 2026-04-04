from uuid import uuid4

from aws_rest_default.permissions import TokenHasResourceScope, TokenHasScope
from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator
from aws_rest_default.views import DefaultJsonRestViewMixing
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.mixins import CreateModelMixin
from rest_framework.response import Response

from oidc.authentication_backends import OidcJsonTokenAuth
from oidc.permissions import TokenHasKidScope
from profiles import models
from profiles.serializers import profile as serializers


class EmailListAPIView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    required_scopes = ("oidc:email",)
    serializer_class = serializers.EmailSerializer
    http_method_names = ["get", "post", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["profile - emails"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_responses={
            "example-1": [
                {
                    "object_id": str(uuid4()),
                    "is_primary": True,
                    "is_verified": True,
                    "email": "fancy_gremlin@example.com",
                },
                {
                    "object_id": str(uuid4()),
                    "is_primary": False,
                    "is_verified": True,
                    "email": "gremlin_fancy@example.com",
                },
            ]
        },
    )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.request.user.emails.all()

    def filter_queryset(self, queryset):
        return queryset


class EmailRetrieveUpdateDestroyAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ("oidc:email",)
    http_method_names = ["get", "patch", "delete", "options"]
    serializer_class = serializers.EmailSerializer
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"

    schema = DefaultGmxSchema(
        tags=["profile - emails"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_requests={"example-1": {"email": "fancy_gremlin@example.com"}, "example-2": {"is_primary": True}},
        example_responses={
            "example-1": {
                "object_id": str(uuid4()),
                "is_primary": True,
                "is_verified": True,
                "email": "fancy_gremlin@example.com",
            }
        },
    )

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        try:
            super().perform_destroy(instance)
        except DjangoValidationError as e:
            raise ValidationError({"non_field_errors": e.messages})

    def get_queryset(self):
        return self.request.user.emails.all()


class EmailSetIsPrimaryAPIView(DefaultJsonRestViewMixing, generics.UpdateAPIView):
    required_scopes = ("oidc:email",)
    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"
    serializer_class = serializers.EmailSetIsPrimarySerializer
    http_method_names = ["patch", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["profile - emails"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_requests={"example-1": {"is_primary": True}},
        example_responses={
            "example-1": {
                "object_id": str(uuid4()),
                "is_primary": True,
                "is_verified": True,
                "email": "fancy_gremlin@example.com",
            }
        },
    )

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.request.user.emails.all()


class PhoneListCreateAPIView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    required_scopes = ("oidc:phone_number",)
    serializer_class = serializers.PhoneSerializer
    http_method_names = ["get", "post", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    schema = DefaultGmxSchema(
        tags=["profile - phones"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_requests={"example-1": {"phone_number": "+13073311888"}, "example-2": {"is_primary": True}},
        example_responses={
            "example-1": [
                {"object_id": str(uuid4()), "is_primary": False, "is_verified": False, "phone_number": "+13073311888"},
                {"object_id": str(uuid4()), "is_primary": False, "is_verified": False, "phone_number": "+13013796134"},
            ]
        },
    )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.request.user.phone_numbers.all()

    def filter_queryset(self, queryset):
        return queryset


class PhoneRetrieveUpdateDestroyAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ("oidc:phone_number",)
    serializer_class = serializers.PhoneSerializer
    http_method_names = ["get", "post", "patch", "delete", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"

    schema = DefaultGmxSchema(
        tags=["profile - phones"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_requests={"example-1": {"is_primary": True}},
        example_responses={
            "example-1": {
                "object_id": str(uuid4()),
                "is_primary": True,
                "is_verified": True,
                "phone_number": "+13013796134",
            }
        },
    )

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        try:
            super().perform_destroy(instance)
        except DjangoValidationError as e:
            raise ValidationError({"non_field_errors": e.messages})

    def get_queryset(self):
        return self.request.user.phone_numbers.all()


class PhoneSetIsPrimaryAPIView(DefaultJsonRestViewMixing, generics.UpdateAPIView):
    required_scopes = ("oidc:phone_number",)
    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"
    serializer_class = serializers.PhoneSetIsPrimarySerializer
    http_method_names = ["patch", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["profile - phones"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_requests={"example-1": {"is_primary": True}},
        example_responses={
            "example-1": {
                "object_id": str(uuid4()),
                "is_primary": True,
                "is_verified": True,
                "phone_number": "+13013796134",
            }
        },
    )

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.request.user.phone_numbers.all()


class AddressListCreateAPIView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    required_scopes = ("oidc:address",)
    serializer_class = serializers.AddressSerializer
    http_method_names = ["get", "post", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["profile - addresses"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_requests={
            "example-1": {
                "line_1": "Ding Xiang Lu",
                "line_2": "910long 11hao 2303shi",
                "city": "PuDongXin",
                "post_code": "200120",
                "region": "Shanghai",
            }
        },
        example_responses={
            "example-1": {
                "line_1": "Long Ming Lu 1897",
                "city": "ShangHai",
                "post_code": "201101",
                "region": "Shanghai",
                "object_id": str(uuid4()),
                "is_verified": True,
            }
        },
    )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.request.user.addresses.all()

    def filter_queryset(self, queryset):
        return queryset


class AddressRetrieveUpdateDestroyAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ("oidc:address",)
    serializer_class = serializers.AddressSerializer
    http_method_names = ["get", "patch", "delete", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"
    schema = DefaultGmxSchema(
        tags=["profile - addresses"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_requests={
            "example-1": {
                "line_1": "Ding Xiang Lu",
            }
        },
        example_responses={
            "example-1": {
                "line_1": "Ding Xiang Lu",
                "line_2": "910long 11hao 2303shi",
                "city": "PuDongXin",
                "post_code": "200120",
                "region": "Shanghai",
                "object_id": str(uuid4()),
                "is_verified": False,
            },
        },
    )

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        try:
            super().perform_destroy(instance)
        except DjangoValidationError as e:
            raise ValidationError({"non_field_errors": e.messages})

    def get_queryset(self):
        return self.request.user.addresses.all()


class AddressSetIsPrimaryAPIView(DefaultJsonRestViewMixing, generics.UpdateAPIView):
    required_scopes = ("oidc:address",)
    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"
    serializer_class = serializers.AddressSetIsPrimarySerializer
    http_method_names = ["patch", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["profile - addresses"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_requests={"example-1": {"is_primary": True}},
        example_responses={
            "example-1": {
                "line_1": "Long Ming Lu 1897",
                "city": "ShangHai",
                "post_code": "201101",
                "region": "Shanghai",
                "object_id": str(uuid4()),
                "is_verified": True,
                "is_primary": True,
            }
        },
    )

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.request.user.addresses.all()


class ProfileRetrieveUpdateAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateAPIView):
    required_scopes = ("oidc:profile",)
    serializer_class = serializers.ProfileSerializer
    http_method_names = ["get", "patch", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["profile"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
    )

    def get_object(self):
        return self.request.user

    def get_queryset(self):
        return models.CustomUser.objects.filter(id=self.request.user.id)

    def filter_queryset(self, queryset):
        return queryset


class CompanyListAPIView(DefaultJsonRestViewMixing, generics.ListAPIView):
    required_scopes = ("oidc:admin:company:read",)
    serializer_class = serializers.CompanySerializer
    http_method_names = ["get", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasScope,)
    schema = DefaultGmxSchema(
        tags=["admin - utils"],
        authentication_schema_types=(
            GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,
            GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,
        ),
        example_responses={
            "example-1": {"sub": str(uuid4()), "name1": "flipSports Limited", "website": "https://flipsports.com"},
        },
    )

    def get_queryset(self):
        return models.Company.objects.all()


class SignSignatureAPIView(DefaultJsonRestViewMixing, CreateModelMixin, generics.GenericAPIView):
    serializer_class = serializers.SignSerializer
    http_method_names = ["post", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasKidScope,)
    schema = DefaultGmxSchema(
        tags=["admin - utils"],
        authentication_schema_types=(
            GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,
            GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,
        ),
        example_requests={
            "example-1": {
                "payload": "this is example payload",
            }
        },
        example_responses={
            "example-1": {
                "signature": "HI9W32hIL9FwWaxhYGKozg_M0yRMQtU24Kf4E9Bt8wQWf9oxK3yynFiealhOrMxeqoP3mpN2-xhRndct"
                "-1z0ev6o1ZTK8EQCAr0vwalnsvjXQ6b7bm9P2kYQ_GOaDO2wTuZLiLUo7O8ybwmxSMtkM5IdvSA0lRe7bJZcC-w"
                "-ISRO9hEhPKEmEhaYXd0hxSpCImjZtZgYK7jOBhwrJNsfGq84W2PWwBk3wdzk6FwDRLQUDYW1ZY8ZQerkcG32V"
                "-MazSMcyTUYwgWQL8nI"
                "-4zqGMm6HyplGRnxJuHIyRyo_0JyqGm3yQt4SbCVDVS9Ho69Uchc3n40KR0UA56WQurjeCnVzoUBcepsRiBHT0aR8MqhR1-NPyuAvzh2fqlMb96ZO2gCgU2E2BOgpnYBfYzMonATO7cL3zV-mwKuXaJbg_s5tWitgilFUKPgJreuOIuVwdpQDDrUJXkyPUUZeXUpNRsg6HSDCRKkqS94sRS_PA55JtB7LjfMsGq1EPL400Z4 "
            },
        },
    )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(kid=kwargs.get("kid"))
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK, headers=headers)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)
