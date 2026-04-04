from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework import permissions, generics, status
from rest_framework.response import Response

from oidc_rest.serializers import reset_password
from oidc_signals.signals import UserPasswordChangedKeySignal, UserPasswordChangedApiSignal
from project.authentication_backends import OidcJsonTokenAuth


class ResetPasswordApiView(DefaultJsonRestViewMixing, generics.GenericAPIView):
    """
    ## Password Reset API endpoint
    
    It is user to send special key to user's email. 
     
    #### `RmxOidcPasswordResetRequest`:
      - `lookup_value` - **Required** Value to look up for user. 
      This value is being used to search: username, display_name and through verified emails.
        
    #### `RmxOidcPasswordResetResponse`:
    __Status codes:__
      - **`HTTP 202`** - If user exists and has been found this means that email with code has been send.
    
    """
    permission_classes = (permissions.AllowAny,)
    http_method_names = ('post', 'options',)
    authentication_classes = ()
    serializer_class = reset_password.ResetPasswordSerializer
    key_serializer = reset_password.PasswordKeyEncoderSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({}, status=status.HTTP_200_OK)


class NewPasswordKeyView(DefaultJsonRestViewMixing, generics.GenericAPIView):
    """
    ## Password Reset Change by Key API endpoint
    
    When user receive on his email Password Reset Key, this token should be send here with new user's password.
    
    #### `RmxOidcPasswordResetChangeRequest`:
      - `key` - **Required** User's Password Reset Key from Password Reset API endpoint
      - `new_password` - **Required** User's new password
      
    #### `RmxOidcPasswordResetChangeResponse`:
    __Status codes:__
      - **`HTTP 200`** - Password changed
      - **`HTTP 400`** - Bad request, input validation error
    
    __Structure of `HTTP 400` responses:__
    
        {
            [field_name or "non_field_errors"]: [List of strings - errors]
        }
    
    Examples:
        
        {
            "new_password": ["This field is to common","This field is too short"]
        }
    """
    permission_classes = (permissions.AllowAny,)
    http_method_names = ('post', 'options',)
    authentication_classes = ()
    serializer_class = reset_password.NewPasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        self.logger.info('Sending UserPasswordChangedKeySignal signal')
        UserPasswordChangedKeySignal.send(
            sender=self.__class__,
            user=serializer.instance,
            email=serializer.instance.email,
            msg_id=self.logger.request_msg_id
        )

        return Response({}, status=status.HTTP_200_OK)


class NewPasswordApiView(DefaultJsonRestViewMixing, generics.GenericAPIView):
    """
    ## Password Reset Change by API endpoint

    When user is logged in and want to change own password, it send old and new password to change it.

    #### `RmxOidcPasswordResetChangeApiRequest`:
      - `old_password` - **Required** User's old password
      - `new_password` - **Required** User's new password

    #### `RmxOidcPasswordResetChangeApiResponse`:
    __Status codes:__
      - **`HTTP 200`** - Password changed
      - **`HTTP 400`** - Bad request, input validation error

    __Structure of `HTTP 400` responses:__

        {
            [field_name or "non_field_errors"]: [List of strings - errors]
        }

    Examples:

        {
            "new_password": ["This field is to common","This field is too short"]
        }
    """
    http_method_names = ('post', 'options',)
    serializer_class = reset_password.ResetPasswordForLoggedUser
    required_scopes = ('oidc:password:write',)
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (permissions.IsAuthenticated, TokenHasScope)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        self.logger.info('Sending UserPasswordChangedApiSignal signal')
        UserPasswordChangedApiSignal.send(
            sender=self.__class__,
            user=serializer.instance,
            email=serializer.instance.email,
            msg_id=self.logger.request_msg_id
        )

        return Response({}, status=status.HTTP_200_OK)
