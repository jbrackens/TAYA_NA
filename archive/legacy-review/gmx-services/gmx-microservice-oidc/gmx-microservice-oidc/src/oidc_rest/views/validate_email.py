from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework import generics, permissions, status
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response

from oidc_rest.serializers.profile import EmailSerializer
from oidc_rest.serializers.validate_email import AddEmailSerializer, VerifyEmailSerializer
from oidc_signals.signals import UserEmailVerifiedSignal
from project.authentication_backends import OidcJsonTokenAuth


class EmailListCreateAPIView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    serializer_class = AddEmailSerializer
    safe_serializer_class = EmailSerializer
    http_method_names = ('get', 'post', 'options')
    required_scopes = ('oidc:email',)
    authentication_classes = (OidcJsonTokenAuth,)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return self.safe_serializer_class
        return self.serializer_class

    def get_queryset(self):
        return self.request.user.emails.all()


class VerifyEmailApiView(DefaultJsonRestViewMixing, generics.CreateAPIView):
    serializer_class = VerifyEmailSerializer
    response_serializer_class = EmailSerializer
    http_method_names = ('post', 'options')
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        response_serializer = self.response_serializer_class(serializer.instance)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        UserEmailVerifiedSignal.send(
            sender=self.__class__,
            user=serializer.instance.user,
            email=serializer.instance.email,
            msg_id=self.logger.request_msg_id
        )
