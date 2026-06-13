from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer
from Cryptodome.Hash import SHA256
from Cryptodome.PublicKey.RSA import import_key
from Cryptodome.Signature import pss
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.signing import b64_encode
from django.db import models
from oidc_provider.models import RSAKey
from phonenumber_field.validators import validate_international_phonenumber
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from common.tools import drf_validate_password
from profiles import models

# noinspection PyUnresolvedReferences


class PrimaryAndVerifiedSerializerMixing(object):
    """
    Mixing used to share logic across Email, Address and Phone field for user.
    """

    def validate(self, data):
        """
        Injects `user` keyword from passed context and sets `is_verified` to False

        :param data: cleaned data from serializer
        :type data: dict
        :raise serializers.ValidationError: when user is not authenticated, wrong context has been set (no request)
        :return: cleaned data with injected `user` and `is_verified`
        """
        data = super().validate(data)

        if "request" in self.context:
            request = self.context.get("request")
        elif "view" in self.context:
            request = self.context.get("view").request
        else:
            raise serializers.ValidationError('Unable to inject "user". Does user is logged in ?')
        user = getattr(request, "user", AnonymousUser)
        if user.is_authenticated:
            data["user"] = user
        else:
            raise serializers.ValidationError("User is not authenticated!")
        data["is_verified"] = False
        return data

    def validate_is_primary(self, value):  # noqa
        return False

    def create(self, validated_data):
        """
        Creates model instance with `is_primary` flag sets to False
        :param validated_data: cleaned serializer data
        :type validated_data: dict
        :return: model instance
        """
        instance = self.Meta.model(**validated_data)
        instance = self._model_clean_and_save(instance)
        self.logger.info("{}: Created {}".format(instance.__class__.__name__, instance))
        return instance

    def _model_clean_and_save(self, model):
        """
        Private method used to change Django validation error to DRF type

        :param model: instance to be validated
        :return: validated model instance
        """
        try:
            model.full_clean()
        except ValidationError as e:
            raise serializers.ValidationError(e.error_dict or e.error_list)
        model.save()
        return model

    def update(self, instance, validated_data):
        """
        Updates values on Model instance without `is_verified`, `user`.
        For better performance it collects fields need to be updated to save parsing time.
        When `is_primary` sets to true it performs validation by calling `set as private` method on instance.
        When `is_validated` on instance is set to true, model can not be edited.

        :param instance: instance to be updated
        :param validated_data: cleaned dict of values to set
        :return: updated instance
        """
        is_primary = validated_data.pop("is_primary", False)

        if not instance.is_primary and is_primary:
            self.logger.info("{}: Setting instance as Primary: {}".format(instance.__class__.__name__, instance))
            try:
                instance.set_as_primary()
            except DjangoValidationError as e:
                raise serializers.ValidationError({"non_field_errors": e.messages})
            return instance

        if instance.is_verified:
            self.logger.warning(
                "{}: Blocking edit on validated instance of {}".format(instance.__class__.__name__, instance)
            )
            raise serializers.ValidationError("Editing validated entity is prohibited.")

        del validated_data["is_verified"]
        del validated_data["user"]

        update_fields = []

        for key, value in validated_data.items():
            if getattr(instance, key) != value:
                update_fields.append(key)
                setattr(instance, key, value)

        if update_fields:
            instance.save(update_fields=update_fields)
            # noinspection PyUnresolvedReferences
            self.logger.info("{}: Updated fields: {}".format(instance.__class__.__name__, update_fields))
        else:
            # noinspection PyUnresolvedReferences
            self.logger.info("{}: Nothing to do. Exiting.".format(instance.__class__.__name__))
        return instance


class PrimarySerializerMixing(object):
    """
    Mixing used to share logic across Email, Address and Phone field for user.
    """

    def validate(self, data):
        """
        Injects `user` keyword from passed context
        :param data: cleaned data from serializer
        :type data: dict
        :raise serializers.ValidationError: when user is not authenticated, wrong context has been set (no request)
        :return: cleaned data with injected `user`
        """
        data = super().validate(data)

        if "request" in self.context:
            request = self.context.get("request")
        elif "view" in self.context:
            request = self.context.get("view").request
        else:
            raise serializers.ValidationError('Unable to inject "user". Does user is logged in ?')
        user = getattr(request, "user", AnonymousUser)
        if user.is_authenticated:
            data["user"] = user
        else:
            raise serializers.ValidationError("User is not authenticated!")
        return data

    def create(self, validated_data):
        raise NotImplementedError("Can't perform this action!")

    def update(self, instance, validated_data):
        """
        Updates value `is_primary` on Model instance.
        For better performance it collects fields need to be updated to save parsing time.
        When `is_primary` sets to true it performs validation by calling `set as private` method on instance.
        Only when `is_validated` on instance is set to true, model can be edited.

        :param instance: instance to be updated
        :param validated_data: cleaned dict of values to set
        :return: updated instance
        """
        print(validated_data)
        is_primary = validated_data.pop("is_primary", False)

        if is_primary and not instance.is_verified:
            # noinspection PyUnresolvedReferences
            self.logger.warning(
                "{}: Blocking edit on none validated instance of {}".format(instance.__class__.__name__, instance)
            )
            raise serializers.ValidationError("Setting 'is_primary' on none validated entity is prohibited.")

        if not instance.is_primary and is_primary:
            # noinspection PyUnresolvedReferences
            self.logger.info("{}: Setting instance as Primary: {}".format(instance.__class__.__name__, instance))
            try:
                instance.set_as_primary()
            except DjangoValidationError as e:
                raise serializers.ValidationError({"non_field_errors": e.messages})
            return instance

        update_fields = []
        del validated_data["user"]

        for key, value in validated_data.items():
            if getattr(instance, key) != value:
                update_fields.append(key)
                setattr(instance, key, value)

        if update_fields:
            instance.save(update_fields=update_fields)
            # noinspection PyUnresolvedReferences
            self.logger.info("{}: Updated fields: {}".format(instance.__class__.__name__, update_fields))
        else:
            # noinspection PyUnresolvedReferences
            self.logger.info("{}: Nothing to do. Exiting.".format(instance.__class__.__name__))
        return instance


class EmailSerializer(PrimaryAndVerifiedSerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Email Serializer
    """

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)

    def create(self, validated_data):
        if models.Email.all_objects.filter(email=validated_data.get("email")).exists():
            raise serializers.ValidationError("email with this email already exists.")
        user: models.CustomUser = validated_data.get("user")
        if not user.is_company and user.originator.company.max_emails <= user.emails.all().count():
            raise serializers.ValidationError("too many emails")
        return super().create(validated_data)

    class Meta:
        model = models.Email
        fields = ("object_id", "is_primary", "is_verified", "email")
        read_only_fields = ("object_id", "is_verified", "is_primary")


class EmailSetIsPrimarySerializer(PrimarySerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Email Serializer Set `is_primary`
    """

    def create(self, validated_data):
        raise NotImplementedError("Can't perform this action!")

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)

    class Meta:
        model = models.Email

        fields = ("object_id", "is_primary", "is_verified", "email")
        read_only_fields = ("is_verified", "object_id", "email")


class PhoneSerializer(PrimaryAndVerifiedSerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    def validate_phone_number(self, value):  # noqa
        validate_international_phonenumber(value)
        return value

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)

    def create(self, validated_data):
        if models.Phone.all_objects.filter(phone_number=validated_data.get("phone_number")).exists():
            raise serializers.ValidationError("phone_number with this phone number already exists.")
        user: models.CustomUser = validated_data.get("user")
        if not user.is_company and user.originator.company.max_phone_numbers <= user.phone_numbers.all().count():
            raise serializers.ValidationError("too many phone numbers")
        return super().create(validated_data)

    class Meta:
        model = models.Phone
        fields = ("object_id", "is_primary", "is_verified", "phone_number")
        read_only_fields = ("object_id", "is_verified", "is_primary")


class PhoneSetIsPrimarySerializer(PrimarySerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Phone Serializer Set `is_primary`
    """

    def create(self, validated_data):
        raise NotImplementedError("Can't perform this action!")

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)

    class Meta:
        model = models.Phone

        fields = (
            "phone_number",
            "object_id",
            "is_verified",
            "is_primary",
        )
        read_only_fields = ("is_verified", "object_id", "phone_number")


class AddressSerializer(PrimaryAndVerifiedSerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Address Serializer
    """

    def create(self, validated_data):
        user: models.CustomUser = validated_data.get("user")
        if not user.is_company and user.originator.company.max_addresses <= user.addresses.all().count():
            raise serializers.ValidationError("too many addresses")
        return super().create(validated_data)

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)

    class Meta:
        model = models.Address

        fields = (
            "country",
            "line_1",
            "line_2",
            "city",
            "post_code",
            "region",
            "object_id",
            "is_verified",
            "is_primary",
        )
        read_only_fields = ("is_verified", "object_id")

        extra_kwargs = {
            "line_2": {"required": False},
            "region": {"required": False},
        }


class AddressSetIsPrimarySerializer(PrimarySerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Address Serializer Set `is_primary`
    """

    def create(self, validated_data):
        raise NotImplementedError("Can't perform this action!")

    def update(self, instance, validated_data):
        with cache.lock(instance.user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            return super().update(instance, validated_data)

    class Meta:
        model = models.Address

        fields = (
            "country",
            "line_1",
            "line_2",
            "city",
            "post_code",
            "region",
            "object_id",
            "is_verified",
            "is_primary",
        )
        read_only_fields = ("is_verified", "object_id", "line_1", "line_2", "country", "city", "post_code", "region")


class SignSerializer(LoggingSerializerMixing, serializers.Serializer):
    payload = serializers.CharField(write_only=True)
    signature = serializers.CharField(read_only=True)

    def update(self, instance, validated_data):
        raise NotImplementedError("Please use administration panel!")

    def create(self, validated_data):
        kid = validated_data.get("kid")
        signature = self._calculate_signature(validated_data.get("payload"), kid)
        result = {"signature": signature}
        return result

    @staticmethod
    def _calculate_signature(payload: str, kid):
        payload_b64: bytes = b64_encode(payload.encode())
        rsa_key_object = list(_ for _ in RSAKey.objects.all() if _.kid == kid)[0]
        rsa_key = import_key(rsa_key_object.key)
        payload_hash = SHA256.new(payload_b64)
        signature: bytes = pss.new(rsa_key).sign(payload_hash)
        signature_b64 = b64_encode(signature).decode()
        return signature_b64


class CompanySerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    def create(self, validated_data):
        """Create not allowed"""
        raise NotImplementedError("Please use administration panel!")

    def update(self, instance, validated_data):
        """Update not allowed"""
        raise NotImplementedError("Please use administration panel!")

    class Meta:
        model = models.Company
        fields = ("sub", "name1", "name2", "website")
        read_only_fields = fields


class ProfileSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Profile Model serializer"
    """

    company = CompanySerializer(required=False, read_only=True)
    email = serializers.EmailField(read_only=True, required=False)
    phone_number = serializers.CharField(read_only=True, required=False)
    originator = CompanySerializer(required=False, source="get_originator_company", read_only=True)

    emails = serializers.ListSerializer(child=EmailSerializer(), read_only=True)
    addresses = serializers.ListSerializer(child=AddressSerializer(), read_only=True)
    phone_numbers = serializers.ListSerializer(child=PhoneSerializer(), read_only=True)

    def create(self, validated_data):
        raise NotImplementedError("Please use registration form!")

    def update(self, instance: models.CustomUser, validated_data: dict):
        with cache.lock(instance.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            instance.refresh_from_db()
            if instance.date_of_birth_verified and "date_of_birth" in validated_data:
                validated_data.pop("date_of_birth")
            return super().update(instance, validated_data)

    class Meta:
        model = models.CustomUser
        fields = (
            "sub",
            "username",
            "email",
            "phone_number",
            "date_of_birth",
            "date_of_birth_verified",
            "originator",
            "company",
            "date_joined",
            "is_limited",
            # editable
            "display_name",
            "first_name",
            "middle_name",
            "last_name",
            "gender",
            "timezone",
            "addresses",
            "emails",
            "phone_numbers",
        )
        read_only_fields = (
            "sub",
            "username",
            "email",
            "phone_number",
            "date_of_birth_verified",
            "originator",
            "company",
            "date_joined",
            "is_limited",
            "addresses",
            "emails",
            "phone_numbers",
        )


class ChangePassword(LoggingSerializerMixing, ReadOnlySerializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[drf_validate_password])

    def validate(self, attrs):
        user = getattr(self.context.get("request"), "user", AnonymousUser)
        if not user.is_authenticated:
            raise serializers.ValidationError({"non_field_errors": "You must be logged in to perform this action"})
        if not user.check_password(attrs.pop("old_password")):
            raise serializers.ValidationError({"old_password": "Wrong password"})
        return attrs

    def create(self, validated_data):
        user = getattr(self.context.get("request"), "user", None)
        if user is None:
            raise serializers.ValidationError({"non_field_errors": "You must be logged in to perform this action"})
        with cache.lock(user.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            new_password = validated_data.pop("new_password")
            user.set_password(new_password)
            user.save(update_fields=["password"])
            self.logger.info("Successfully changed password for user: {} by API".format(user))
        return user
