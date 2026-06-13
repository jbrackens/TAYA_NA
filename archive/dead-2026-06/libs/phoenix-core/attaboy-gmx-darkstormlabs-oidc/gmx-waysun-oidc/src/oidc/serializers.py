from aws_rest_default.serializers import LoggingSerializerMixing
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from rest_framework import serializers

from oidc import models
from oidc.token_tools import PERMISSIONS_LIST
from profiles import models as profile_models


class CustomUserSocialSecretSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    class Meta:
        model = models.SocialSecret
        fields = ["object_id", "social_type", "client_id", "client_secret"]
        read_only_fields = ("object_id",)

    def validate(self, data):
        audience = self.context.get("request").auth.get("aud")
        social_secret = models.SocialSecret.objects.filter(
            oidc_client_extra__oidc_client__client_id=audience,
            social_type=data.get("social_type"),
        ).exists()
        if social_secret:
            raise serializers.ValidationError({"social_type": "This social_type already exist"})
        return data


class OpenidSerializer(LoggingSerializerMixing, serializers.Serializer):
    object_id = serializers.CharField(read_only=True)
    name = serializers.CharField(source="oidc_client.name", read_only=True)
    default_permissions_set = serializers.ListField(child=serializers.CharField(), source="get_default_permissions_str")
    limited_permissions_set = serializers.ListField(child=serializers.CharField(), source="get_limited_permissions_str")
    social_secrets = serializers.ListSerializer(child=CustomUserSocialSecretSerializer(), read_only=True)

    @staticmethod
    def _validate_permissions_set(value):
        value_set = set(_ for _ in value)
        permissions_set = set(name for name, description in PERMISSIONS_LIST)
        if not value_set.issubset(permissions_set):
            raise serializers.ValidationError("Not valid permission. Please provide valid permission")
        return list(models.OidcPermissions.objects.filter(name__in=value_set))

    def validate_default_permissions_set(self, value):
        return self._validate_permissions_set(value)

    def validate_limited_permissions_set(self, value):
        return self._validate_permissions_set(value)

    def create(self, validated_data):
        raise NotImplementedError("This can be perform only by SuperAdmin!")

    def update(self, instance, validated_data):
        with cache.lock(instance.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            default_set = validated_data.get("get_default_permissions_str")
            limited_set = validated_data.get("get_limited_permissions_str")
            self.logger.info(default_set)
            if default_set is None:
                pass
            elif len(default_set) == 0:
                instance.default_permissions_set.clear()
            else:
                instance.default_permissions_set.set(default_set)
            if limited_set is None:
                pass
            elif len(limited_set) == 0:
                instance.limited_permissions_set.clear()
            else:
                instance.limited_permissions_set.set(limited_set)
            instance.save()
        return instance

    class Meta:
        model = models.OidcClientExtra
        fields = ("object_id", "name", "default_permissions_set", "limited_permissions_set", "social_secrets")
        read_only_fields = ("object_id", "name", "social_secrets")


class ExternalUserMappingSerializer(LoggingSerializerMixing, serializers.Serializer):
    external_user_id = serializers.CharField(
        write_only=True, required=True, max_length=150
    )  # oidc.ExternalUserMappingModel.external_user_id.max_length = 150
    username = serializers.CharField(
        write_only=True, required=False, allow_null=True
    )  # profile.CustomUser.username.max_length
    email = serializers.EmailField(write_only=True, required=False, allow_null=True)
    phone_number = serializers.CharField(write_only=True, required=False, allow_null=True)

    user_sub = serializers.CharField(read_only=True)
    is_created = serializers.BooleanField(read_only=True)
    was_mapped = serializers.BooleanField(read_only=True)
    _cache_hit = serializers.BooleanField(read_only=True)

    def validate_external_user_id(self, value: str):
        return value.strip()

    def _check_value(self, value):
        if value:
            raise serializers.ValidationError("isolation mode only - option not allowed")
        return value

    def validate_username(self, value):
        return self._check_value(value)

    def validate_email(self, value):
        return self._check_value(value)

    def validate_phone_number(self, value):
        return self._check_value(value)

    def create(self, validated_data):
        self._check_isolation_mode(validated_data)
        external_user_id = validated_data.pop("external_user_id")
        company = self._get_originator_from_auth()

        result = dict(is_created=False, was_mapped=False)

        cache_arn = models.ExternalUserMappingModel.get_cache_arn(
            company_sub=company.sub, external_user_id=external_user_id
        )

        user_sub = cache.get(cache_arn, None)
        if user_sub:
            result["user_sub"] = user_sub
            result["_cache_hit"] = True
            return result

        external_user_mapping = models.ExternalUserMappingModel.objects.filter(
            external_user_id=external_user_id, originator=company
        ).first()
        if external_user_mapping is None or not external_user_mapping:
            with cache.lock(f"arn:oidc:external_user_mapping:{company.sub}", expire=settings.CACHE_LOCK_MAX_TIMEOUT):
                external_user_mapping = models.ExternalUserMappingModel.objects.filter(
                    external_user_id=external_user_id, originator=company
                ).first()
                if external_user_mapping is None or not external_user_mapping:
                    with transaction.atomic():
                        self.logger.info(
                            f"Creating a new mapping for ext_id({external_user_id}) and company({company.sub})"
                        )

                        user = profile_models.CustomUser.objects.create_simple_user(
                            originator=profile_models.CustomUser.objects.get_company_user_by_company(company),
                        )
                        external_user_mapping = models.ExternalUserMappingModel(
                            external_user_id=external_user_id,
                            originator=company,
                            custom_user=user,
                        )
                        external_user_mapping.save()
                        result["is_created"] = True
                        result["was_mapped"] = True
        else:
            self.logger.info(f"Mapping exists - skipped user creation")
        result["user_sub"] = external_user_mapping.custom_user.sub
        cache.set(cache_arn, result["user_sub"], timeout=settings.CACHE_LONG_TTL)
        return result

    def _check_isolation_mode(self, validated_data):
        username = validated_data.pop("username")
        email = validated_data.pop("email")
        phone_number = validated_data.pop("phone_number")
        if any([username, email, phone_number]):
            self.logger.error(
                f"isolation mode only supported. [username, email, phone_number] must be list of false but got ['{username}', '{email}', '{phone_number}']"
            )
            raise serializers.ValidationError("additional not valid parameters - isolation mode")

    def _get_originator_from_auth(self) -> profile_models.CustomUser:
        company_sub = self.context.get("request").auth.get("extra", dict()).get("ops", None)
        if company_sub is None or not company_sub:
            self.logger.error(f"'extra' dict in 'auth' of 'request' has an empty 'ops'")
            raise serializers.ValidationError("wrong auth context")
        company = profile_models.Company.objects.filter(sub=company_sub).first()
        if company is None or not company:
            self.logger.error(
                f"'extra' dict in 'auth' of 'request' has an 'ops'({company_sub}) which points to undefined company"
            )
            raise serializers.ValidationError("wrong auth context")
        return company

    def update(self, instance, validated_data):
        raise NotImplementedError()
