from rest_framework import serializers
from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer


class ExternalUserMappingModelSerializer(ReadOnlySerializer, LoggingSerializerMixing):
    company_id = serializers.UUIDField()
    company_name1 = serializers.CharField(source='company__name1')
    company_name2 = serializers.CharField(source='company__name2',
                                          required=False,
                                          allow_blank=True,
                                          allow_null=True)
    external_user_id = serializers.CharField()
    username = serializers.CharField(source='user__sub')
    last_seen = serializers.DateTimeField(source='user__last_login', allow_null=True, required=False)
    originator = serializers.UUIDField(source='user__originator__company__pk', allow_null=True, required=False)




