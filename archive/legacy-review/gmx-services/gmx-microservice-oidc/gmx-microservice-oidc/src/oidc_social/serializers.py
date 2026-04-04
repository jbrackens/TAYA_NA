from aws_rest_default.serializers import ReadOnlySerializer, LoggingSerializerMixing
from rest_framework import serializers


class SocialTokenSerializer(ReadOnlySerializer, LoggingSerializerMixing):
    st = serializers.CharField(source='social_type', help_text='social_type')
    stv = serializers.CharField(source='get_social_type_display', help_text='get_social_type_display')
    tk = serializers.JSONField(source='social_token', help_text='social_token')
    dt = serializers.DateTimeField(source='created_at', help_text='created_at')
