import logging

from aws_rest_default.serializers import LoggingSerializerMixing
from rest_framework import serializers

from . import models

logger = logging.getLogger(__name__)


class ChinaMobileProductPaymentSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    sub = serializers.BooleanField()

    class Meta:
        model = models.ChinaMobileProductPaymentModel
        fields = [
            "sub",
        ]
