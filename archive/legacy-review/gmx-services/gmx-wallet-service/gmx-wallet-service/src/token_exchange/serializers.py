from time import time

from aws_rest_default.serializers import LoggingSerializerMixing
from aws_rest_default.tools import decrypt_b64
from rest_framework import serializers
from nacl import exceptions as nacl_exceptions
from binascii import Error as BinasciiError
from wallet import models


class PaymentTokenValidationMixing(object):

    def validate_payment_token(self, value):
        try:
            val = decrypt_b64(value)
        except (nacl_exceptions.CryptoError, BinasciiError) as e:
            self.logger.warning('Wrong payment_token: {}'.format(e))
            raise serializers.ValidationError('Wrong payment token')

        user_sub = val.get('u', None)
        if not user_sub:
            self.logger.warning('Wrong USER_SUB in token')
            raise serializers.ValidationError('Wrong payment token')

        if val.get('e', 0) < time():
            self.logger.warning('Payment Token expired')
            raise serializers.ValidationError('Wrong payment token')

        return val


class CurrentBalancePaymentTokenSerializer(LoggingSerializerMixing, PaymentTokenValidationMixing, serializers.Serializer):
    payment_token = serializers.CharField(write_only=True)
    current_balance = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True, help_text='User\'s current balance on default wallet', allow_null=True)
    display_name = serializers.CharField(read_only=True, help_text='User\'s displayName from SB Tech', allow_blank=True, allow_null=True)

    def validate(self, attrs):
        val = attrs.get('payment_token')
        user_sub = val.get('u', None)
        attrs['display_name'] = val.get('d', None)
        attrs['current_balance'] = models.Wallet.objects.filter(_is_default=True, user__username=user_sub).values_list('current_balance', flat=True).first()
        return attrs

    def create(self, validated_data):
        return {
            'current_balance': validated_data['current_balance'],
            'display_name': validated_data['display_name']
        }

    def update(self, instance, validated_data):
        pass
