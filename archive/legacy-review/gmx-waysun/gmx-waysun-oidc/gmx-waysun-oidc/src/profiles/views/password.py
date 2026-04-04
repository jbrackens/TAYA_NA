from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator
from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework import generics, status
from rest_framework.response import Response

from oidc.authentication_backends import OidcJsonTokenAuth
from profiles.serializers.profile import ChangePassword


class ChangePasswordApiView(DefaultJsonRestViewMixing, generics.GenericAPIView):
    http_method_names = (
        "post",
        "options",
    )
    serializer_class = ChangePassword
    required_scopes = ("oidc:password:write",)
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasScope,)
    schema = DefaultGmxSchema(
        tags=["profile - utils"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_USER,),
        example_responses={"example-1": "ok"},
        example_requests={"example-1": {"old_password": "old_password", "new_password": "Sup3S3cretP4$$w0rd"}},
    )

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response("ok", status=status.HTTP_200_OK)
