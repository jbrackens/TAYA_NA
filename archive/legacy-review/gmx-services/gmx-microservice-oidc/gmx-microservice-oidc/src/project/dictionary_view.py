from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class DictionariesView(DefaultJsonRestViewMixing, APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    http_method_names = ('get', 'options')

    def get(self, request):
        from profiles.models import CustomUser, AbstractAddressModel
        from oidc.models import SocialSecret
        choices = {
            'gender': CustomUser.GENDER_CHOICES,
            'timezone': CustomUser.TIMEZONE_CHOICES,
            'country': AbstractAddressModel.COUNTRY_CHOICES,
            'social_type': SocialSecret.SOCIAL_TYPE_CHOICES.to_choices()
        }
        result = {
            k: [dict(zip(['id', 'name'], i)) for i in v] for k, v in choices.items()
        }
        return Response(result)
