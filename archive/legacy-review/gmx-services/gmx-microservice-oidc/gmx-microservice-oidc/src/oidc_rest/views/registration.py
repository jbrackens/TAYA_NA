from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework import generics, permissions

from oidc_rest.serializers.registration import RegistrationSerializer


class RegistrationCreateApiView(DefaultJsonRestViewMixing, generics.CreateAPIView):
    """
    ##  Registration API endpoint.
    
    It is used to register user with specific originator.
    
    #### `RmxOidcRegistrationRequest`:
      - `username` - *(Optional)* Unique username
      - `email` - **Required** User's email
      - `password` - **Required** User's password
      - `originators_client_id` - **Required** Partner's Client ID
      
    #### `RmxOidcRegistrationResponse`:
    __Status codes:__
      - **`HTTP 201`** - User created as active, with invalidated email. Permissions limited
      - **`HTTP 400`** - Bad request, input validation error
      
    __Structure of `HTTP 400` responses:__
    
        {
            [field_name or "non_field_errors"]: [List of strings - errors]
        }
    
    Examples:
        
        {
            "password": ["This field is to common","This field is too short"]
        }
        
        
    """
    http_method_names = ('post', 'options')
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()
    serializer_class = RegistrationSerializer
