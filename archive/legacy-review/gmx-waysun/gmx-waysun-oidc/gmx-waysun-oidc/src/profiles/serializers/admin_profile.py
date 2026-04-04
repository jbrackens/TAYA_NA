from enum import Enum

from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from phonenumber_field.validators import validate_international_phonenumber
from rest_framework import serializers

from common.tools import drf_validate_password
from oidc.token_tools import JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY
from profiles import models
from profiles.serializers import profile as profile_serializers


class CustomUserSocialAccountDetailsSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    class Meta:
        model = models.SocialAccountDetails
        fields = ("object_id", "social_account_type", "social_account_id", "social_account_extra")
        read_only_fields = ("object_id",)

    def _validate_user(self, attrs):
        """
        :param attrs: this will have injected user from view execution because injecting is not being passed into "validate" method"
        :return:
        """
        user = attrs.get("user", None)
        if not isinstance(user, models.CustomUser):
            self.logger.error(f"Wrong user value: {user}")
            raise serializers.ValidationError({"user": "wrong value"})
        social_account_type = attrs.get("social_account_type")
        if not social_account_type:
            self.logger.error(f"Wrong value for social_account_type. Got: {attrs}")
            raise serializers.ValidationError({"social_account_type": "wrong value"})
        if user.social_accounts_set.filter(social_account_type=social_account_type).count() > 0:
            attrs["is_create_allowed"] = False
        else:
            attrs["is_create_allowed"] = True
        return attrs

    def create(self, validated_data):
        validated_data = self._validate_user(validated_data)
        is_create_allowed = validated_data.pop("is_create_allowed", False)
        if not is_create_allowed:
            self.logger.error(f"is_create_allowed({is_create_allowed})")
            raise serializers.ValidationError({"non_field_errors": "create not allowed - user has this type"})

        user = validated_data.get("user", None)
        with cache.lock(user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            return super().create(validated_data)

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)


class CustomUserSocialAccountUpdateSerializer(CustomUserSocialAccountDetailsSerializer):
    class Meta(CustomUserSocialAccountDetailsSerializer.Meta):
        read_only_fields = ("object_id", "social_account_type")


class ChangePasswordByAdmin(LoggingSerializerMixing, ReadOnlySerializer):
    class LoginTypeEnum(Enum):
        USERNAME = "username"
        SUB = "sub"
        EMAIL = "email"
        PHONE_NUMBER = "phone_number"

        @classmethod
        def to_choices(cls):
            return list((item.value, item.value) for item in cls)

    login_type = serializers.ChoiceField(choices=LoginTypeEnum.to_choices(), write_only=True)
    login = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[drf_validate_password])
    sub = serializers.CharField(read_only=True)

    def validate(self, attrs):
        login = attrs.get("login")
        login_type = self.LoginTypeEnum(attrs.get("login_type"))
        audience = self.context.get("request").auth.get("aud")
        if login_type == self.LoginTypeEnum.USERNAME:
            qs = models.CustomUser.objects.filter_by_username(username=login)
        elif login_type == self.LoginTypeEnum.SUB:
            qs = models.CustomUser.objects.filter_by_sub(
                sub=login,
            )
        elif login_type == self.LoginTypeEnum.EMAIL:
            qs = models.CustomUser.objects.filter_by_email(
                email=login,
            )
        elif login_type == self.LoginTypeEnum.PHONE_NUMBER:
            qs = models.CustomUser.objects.filter_by_phone_number(
                phone_number=login,
            )
        user = qs.filter(originator__oidc_client_extra__oidc_client__client_id=audience).first()
        if user is None:
            raise serializers.ValidationError({"login": "user not found"})
        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        user = validated_data.pop("user")
        if not isinstance(user, models.CustomUser):
            raise serializers.ValidationError({"non_field_errors": "Wrong User parameters"})
        new_password = validated_data.get("new_password")
        with cache.lock(user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            user.set_password(new_password)
            user.save(update_fields=["password"])
            self.logger.info(
                f"Successfully changed password for user: {user} by: {getattr(getattr(self.context.get('request'), 'user'), 'sub')}"
            )
        return user


class AdminProfileSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    company = profile_serializers.CompanySerializer(required=False, read_only=True)
    email = serializers.EmailField(read_only=True, required=False)
    phone_number = serializers.CharField(read_only=True, required=False)
    originator = profile_serializers.CompanySerializer(required=False, source="get_originator_company", read_only=True)

    emails = serializers.ListSerializer(child=profile_serializers.EmailSerializer(), read_only=True)
    addresses = serializers.ListSerializer(child=profile_serializers.AddressSerializer(), read_only=True)
    phone_numbers = serializers.ListSerializer(child=profile_serializers.PhoneSerializer(), read_only=True)

    def create(self, validated_data):
        raise NotImplementedError("Please use registration form!")

    def update(self, instance, validated_data):
        with cache.lock(instance.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)

    class Meta:
        model = models.CustomUser
        fields = (
            "sub",
            "username",
            "email",
            "phone_number",
            "originator",
            "company",
            "date_joined",
            "is_limited",
            "date_of_birth",
            "date_of_birth_verified",
            "display_name",
            "first_name",
            "middle_name",
            "last_name",
            "gender",
            "timezone",
            "addresses",
            "emails",
            "phone_numbers",
            "is_active",
            "is_limited",
            "is_test_user",
            "is_temporary",
        )
        read_only_fields = (
            "sub",
            "username",
            "email",
            "phone_number",
            "originator",
            "company",
            "date_joined",
            "addresses",
            "emails",
            "phone_numbers",
        )


class CreateAdminProfileSerializer(AdminProfileSerializer):
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    username = serializers.RegexField(max_length=150, regex=r"^[a-z_0-9\-]{8,150}$", required=False)
    password = serializers.CharField(write_only=True, validators=[drf_validate_password])

    def validate_username(self, value: str):  # noqa
        if models.CustomUser.objects.filter_by_username(username=value).exists():
            raise serializers.ValidationError("wrong value")
        return value

    def validate_phone_number(self, value):  # noqa
        try:
            validate_international_phonenumber(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def validate(self, attrs: dict):
        email = attrs.get("email")
        phone_number = attrs.get("phone_number")
        username = attrs.get("username") if "username" in attrs else None
        self.logger.info("%" * 30)
        self.logger.info(username)
        self.logger.info("%" * 30)
        if not any([email, username, phone_number]):
            raise serializers.ValidationError(
                {"non_field_errors": "at least one of 'email', 'phone_number', 'username' must be provided"}
            )
        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError({"non_field_errors": "Serializer not initialized with request context!"})
        auth = getattr(request, "auth")
        if (
            not auth
            or not isinstance(auth, dict)
            or not auth.get("extra", dict()).get(JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY)
        ):
            raise serializers.ValidationError({"non_field_errors": "Serializer not initialized with JWT auth context"})
        audience = auth.get("extra", dict()).get(JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY)
        originator = models.CustomUser.objects.filter(company__sub=audience)

        attrs.update(
            dict(
                originator=originator,
                is_company=False,
                is_staff=False,
                is_superuser=False,
            )
        )
        attrs.setdefault("is_active", False)
        attrs.setdefault("is_limited", True)
        return attrs

    def update(self, instance, validated_data):
        raise NotImplementedError("This is create serializer not update/patch")

    def create(self, validated_data):
        with transaction.atomic():
            password = validated_data.pop("password")
            email = validated_data.pop("email") if "email" in validated_data else None
            phone_number = validated_data.pop("phone_number") if "phone_number" in validated_data else None
            instance: models.CustomUser = models.CustomUser.objects.create(**validated_data)

            if email:
                email_serializer = EmailAdminSerializer(
                    data=dict(email=email, user=instance.id, is_verified=True, is_primary=True),
                )
                if email_serializer.is_valid(raise_exception=True):
                    email_serializer.save()

            if phone_number:
                phone_serializer = PhoneAdminSerializer(
                    data=dict(phone_number=phone_number, user=instance.id, is_verified=True, is_primary=True),
                    context=self.context,
                )
                if phone_serializer.is_valid(raise_exception=True):
                    phone_serializer.save()

            instance.set_password(password)
            instance.save()
            return instance

    class Meta(AdminProfileSerializer.Meta):
        fields = AdminProfileSerializer.Meta.fields + ("password",)
        read_only_fields = (
            "sub",
            "originator",
            "company",
            "date_joined",
            "addresses",
            "emails",
            "phone_numbers",
            "is_deleted",
        )


class UserLastSeenSerializer(ReadOnlySerializer, LoggingSerializerMixing):
    """
    Serializer used to `touch` last_seen field on user
    """

    sub = serializers.CharField(max_length=36, min_length=36)
    updated = serializers.BooleanField(read_only=True)

    def create(self, validated_data):
        user_sub = validated_data.get("sub")
        result = models.CustomUser.objects.filter(sub=user_sub).update(last_login=timezone.now())
        return {"sub": user_sub, "updated": (result > 0)}


class EmailAdminSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Email Admin Serializer
    """

    # NOT USED AT THE MOMENT
    # def update(self, instance, validated_data):
    #     with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
    #         instance.refresh_from_db()
    #         return super().update(instance, validated_data)

    def create(self, validated_data):
        user: models.CustomUser = validated_data.get("user")
        if not user.is_company and user.originator.company.max_emails <= user.emails.all().count():
            raise serializers.ValidationError("too many emails")
        return super().create(validated_data)

    class Meta:
        model = models.Email
        fields = ("object_id", "is_primary", "is_verified", "email", "user")
        read_only_fields = ("object_id",)


class PhoneAdminSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Phone Admin Serializer
    """

    def create(self, validated_data):
        user: models.CustomUser = validated_data.get("user")
        if not user.is_company and user.originator.company.max_phone_numbers <= user.phone_numbers.all().count():
            raise serializers.ValidationError("too many phone numbers")
        return super().create(validated_data)

    def validate_phone_number(self, value):  # noqa
        validate_international_phonenumber(value)
        return value

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)

    class Meta:
        model = models.Phone
        fields = ("object_id", "is_primary", "is_verified", "phone_number", "user")
        read_only_fields = ("object_id", "is_verified")


class AddressVerifiedSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Address Serializer
    """

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            if instance.is_verified:
                self.logger.warning(
                    "{}: Blocking edit on validated instance of {}".format(instance.__class__.__name__, instance)
                )
                raise serializers.ValidationError("Editing validated entity is prohibited.")
            if validated_data.get("is_verified", None):
                instance.set_verified()
            return instance

    class Meta:
        model = models.Address
        fields = (
            "object_id",
            "is_verified",
        )
        read_only_fields = ("object_id",)


class EmailVerifiedSerializer(AddressVerifiedSerializer):
    class Meta:
        model = models.Email
        fields = AddressVerifiedSerializer.Meta.fields
        read_only_fields = AddressVerifiedSerializer.Meta.read_only_fields


class PhoneVerifiedSerializer(AddressVerifiedSerializer):
    class Meta:
        model = models.Phone
        fields = AddressVerifiedSerializer.Meta.fields
        read_only_fields = AddressVerifiedSerializer.Meta.read_only_fields
