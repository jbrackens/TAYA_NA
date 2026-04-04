from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework.generics import GenericAPIView
from rest_framework import status
from rest_framework.response import Response

from token_exchange.serializers import CurrentBalancePaymentTokenSerializer


class CurrentBalanceForPaymentTokenView(DefaultJsonRestViewMixing, GenericAPIView):
    """
    PaymentToken exchange endpoint.

        :permissions:  wallet:token:exchange
    """
    http_method_names = ['post', 'options']
    serializer_class = CurrentBalancePaymentTokenSerializer
    permission_classes = [TokenHasScope]
    required_scopes = ('wallet:token:current_balance',)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)