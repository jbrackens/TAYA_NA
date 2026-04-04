from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from aws_rest_default.views import DefaultJsonRestViewMixing


class DictionariesView(DefaultJsonRestViewMixing, APIView):
    authentication_classes = ()
    permission_classes = (AllowAny, )
    http_method_names = ('get', 'options')

    def get(self, request):
        from wallet.models import WalletLine
        choices = {
            'operation_type': WalletLine.OPERATION_TYPE_CHOICES.to_choices(),
        }
        result = {
            k: [dict(zip(['id', 'name'], i)) for i in v] for k, v in choices.items()
        }
        return Response(result)
