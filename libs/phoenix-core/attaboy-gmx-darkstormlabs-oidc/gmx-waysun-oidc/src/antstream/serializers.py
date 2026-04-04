from aws_rest_default.serializers import LoggingSerializerMixing
from rest_framework import serializers

from antstream.models import AntstreamModel
from antstream.tools import create_antstream_token, create_order_token
from oidc import models
from profiles import models as profile_models


class AntstreamLoginSerializer(LoggingSerializerMixing, serializers.Serializer):
    user_id = serializers.CharField(write_only=True)
    antstream_token = serializers.CharField(read_only=True)
    order_token = serializers.CharField(read_only=True)

    def update(self, instance, validated_data):
        raise NotImplemented()

    def validate_user_id(self, external_user_id):
        antstream_conf = AntstreamModel.objects.filter().get()
        external_user_mapping = models.ExternalUserMappingModel.objects.filter(
            external_user_id=external_user_id, originator=antstream_conf.oidc_client_extra.user.company
        ).first()
        if not external_user_mapping:
            self.logger.info("`external_user_id` unknown, creating new External User mapping.")
            user = profile_models.CustomUser.objects.create_simple_user(
                originator=antstream_conf.oidc_client_extra.user,
            )
            external_user_mapping = models.ExternalUserMappingModel(
                external_user_id=external_user_id,
                originator=antstream_conf.oidc_client_extra.user.company,
                custom_user=user,
            )
            external_user_mapping.save()
        else:
            user = external_user_mapping.custom_user
        return external_user_id, user.sub, str(user.get_originator_company().sub), user.is_test_user

    def create(self, validated_data):
        external_user_id, user_sub, originator_sub, is_test_user = validated_data.get("user_id")
        antstream_token = create_antstream_token(user_sub)
        order_token = create_order_token(
            user_sub=user_sub,
            external_user_id=external_user_id,
            originator_sub=originator_sub,
            is_test_user=is_test_user,
        )
        result = {"antstream_token": antstream_token, "order_token": order_token}
        return result
