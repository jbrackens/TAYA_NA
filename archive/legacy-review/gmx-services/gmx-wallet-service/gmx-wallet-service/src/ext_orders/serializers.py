import hashlib

from aws_rest_default.serializers import LoggingSerializerMixing, CompanyRefSerializer
from django.db.models import Q
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from . import models


class PartnerTransactionApiKeysSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    class Meta:
        model = models.PartnerTransactionApiKeys
        fields = ('public_key',)


class PartnerTransactionApiKeysRecreateSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    class Meta:
        model = models.PartnerTransactionApiKeys
        fields = ('public_key', 'private_key')


class ValidateExternalOrderSerializer(LoggingSerializerMixing, serializers.Serializer):
    total = serializers.IntegerField()
    transaction_id = serializers.CharField(max_length=32)
    nonce = serializers.CharField(max_length=32)
    cancel_url = serializers.URLField()
    return_url = serializers.URLField()
    signature = serializers.CharField(max_length=40)

    def validate(self, attrs):
        total = attrs['total']
        transaction_id = attrs['transaction_id']
        nonce = attrs['nonce']
        public_key = self.context['public_key']
        signature = attrs['signature']
        self.logger.info('Validate before %s' % public_key)
        private_key = models.PartnerTransactionApiKeys.objects.get_private_for_key(public_key, attrs['cancel_url'])
        self.logger.info('Validate after %s' % public_key)
        result = hashlib.sha1(
            ';'.join([
                str(int(total)),
                transaction_id,
                nonce,
                private_key
            ]).encode()
        ).hexdigest() == signature
        if not result:
            raise ValidationError({'signature': 'wrong signature'})

        partner = models.PartnerTransactionApiKeys.objects.filter(public_key=public_key).first().partner
        query = (Q(nonce=nonce) | Q(external_transaction_id=transaction_id))

        if models.ExternalOrder.objects.filter(Q(partner=partner), query).exists():
            raise ValidationError({'nonce': 'wrong_param', 'transaction_id': 'wrong_param'})
        attrs['partner'] = partner
        return attrs

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        partner = validated_data['partner']
        nonce = validated_data['nonce']
        external_transaction_id = validated_data['transaction_id']

        ext_order = models.ExternalOrder(
            partner=partner,
            status=models.ExternalOrder.STATUS.PENDING,
            external_transaction_id=external_transaction_id,
            return_url=validated_data['return_url'],
            cancel_url=validated_data['cancel_url'],
            nonce=nonce,
            total_amount=validated_data['total']
        )
        ext_order.save()
        return ext_order


class ExternalOrderSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    status = serializers.CharField(max_length=64, source='status_mapping')
    partner = CompanyRefSerializer()

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        pass

    class Meta:
        model = models.ExternalOrder
        fields = ('id', 'status', 'external_transaction_id', 'partner',
                  'created_at', 'updated_at', 'total_amount'
                  )


class ExternalOrderActionSerializer(LoggingSerializerMixing, serializers.Serializer):
    action = serializers.CharField(max_length=20)

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        pass


class GetExternalOrderDetailsSerializer(LoggingSerializerMixing, serializers.Serializer):
    order = ExternalOrderSerializer()
    actions = ExternalOrderActionSerializer(many=True, allow_null=True)

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        pass
