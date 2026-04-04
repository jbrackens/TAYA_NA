import random
import time

from aws_rest_default.serializers import ReadOnlySerializer, LoggingSerializerMixing
from aws_rest_default.tools import encrypt_b64, decrypt_b64
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import Argon2PasswordHasher
from django.contrib.auth.models import AnonymousUser
from django.db.models import Q
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from oidc_rest.serializers import normalize_date_from_unix_timestamp
from oidc_rest.validators import validate_password, future_validator
from oidc_signals.signals import UserPasswordResetRequestSignal
from profiles.models import CustomUser


class PasswordKeyObjectSerializer(ReadOnlySerializer):
    """
    Dummy serializer to holds object encrypted for user to generate key used in Password Reset.

    It creates object then it is being used to create json value and encrypt/decrypt by PasswordKeyEncoderSerializer.
    This Serializer validates user PK and expiration date (stored as Unix timestamp)
    """

    u = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())  # user'sPK
    e = serializers.IntegerField(min_value=time.time(), validators=[future_validator, ])  # Expiration date as Unix timestamp
    h = serializers.CharField(required=False)  # Hash of user password's hash

    def validate(self, attrs):
        """
        Used to calculate "h" value as hash of user's hash
        :param attrs: dict of already cleaned values
        :return: attrs
        """
        user = attrs.get('u')
        exp = attrs.get('e')
        h = attrs.get('h')
        ch = Argon2PasswordHasher().encode(password=user.password, salt=exp).split('p=')[1]
        if h is None or not h:
            # we need to calculate hash
            attrs['h'] = Argon2PasswordHasher().encode(password=user.password, salt=exp).split('p=')[1]
        elif ch != h:
            # this happens when user change password during valid period of key, so it is valid during valid period and util user change password
            raise ValidationError('key invalid or already used')
        return attrs


class PasswordKeyEncoderSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    """
    Main serializer used to encode/decode Password Reset Key, generated for user.
    It creates Key object using PasswordKeyObjectSerializer and encodes it using pyNaCl 

    """
    user = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all(), required=False)
    key = serializers.CharField(required=False)

    key_valid_time = 60 * 60 * 2  # How long key is valid in seconds?

    def make_key_obj_from_user(self, user):
        """
        Creates Key Object Serializer from User and validates it.

        :param user: User instance 
        :raise ValidationError: on Key Object Serializer is_valid method 
        :return: Key Serializer
        :rtype: PasswordKeyObjectSerializer
        """
        exp = int(time.time()) + self.key_valid_time
        key_serializer = PasswordKeyObjectSerializer(data={'u': user.pk, 'e': exp}, context=self.context)
        key_serializer.is_valid(raise_exception=True)
        return key_serializer

    def make_key_obj_from_key(self, key):
        """
        Creates Key Object Serializer from Key and validates it.

        :param key: Encrypted Key used to reset password (send to user)
        :raise ValidationError: on Key Object Serializer is_valid method 
        :return: Key Serializer
        :rtype: PasswordKeyObjectSerializer
        """
        obj = decrypt_b64(key)
        key_serializer = PasswordKeyObjectSerializer(data=obj, context=self.context)
        key_serializer.is_valid(raise_exception=True)
        return key_serializer

    def validate(self, attrs):
        """
        When `user`'s PK is being passed during initialization, it creates Key Object and encrypt it in `key` key of validated_data.

        When 'key' is being passed during initialization, it decrypts it, creates Key Object and place User in `user` key of validated_data.

        :param attrs: dict contains `user` or `key` value
        :type attrs: dict
        :raise ValidationError: on Key decrypt problems or nether `user` or `key` has not been passed
        :return: dict contains `user` - and instance of User, `key` - encrypted Key Object to send to user and `obj` as Key Object
        :rtype: dict
        """
        if 'user' in attrs and attrs['user']:
            attrs['obj'] = self.make_key_obj_from_user(attrs['user'])
            attrs['key'] = encrypt_b64(attrs['obj'].data)
            self.logger.info('Created PasswordRestKey for user {}'.format(attrs['user']))
        elif 'key' in attrs and attrs['key']:
            try:
                attrs['obj'] = self.make_key_obj_from_key(attrs['key'])
                attrs['user'] = attrs['obj'].validated_data['u']
                self.logger.info('Decoded True PasswordResetKey for user: {}'.format(attrs['user']))
            except Exception:
                raise ValidationError({'key': 'Wrong key'})
        else:
            raise ValidationError('"key" or "user" is required')
        return attrs


class ResetPasswordSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    lookup_value = serializers.CharField(min_length=5, max_length=200, required=True)
    key_serializer = PasswordKeyEncoderSerializer

    def get_filtered_field_names(self):
        """
        Used to return field names used to search user. Can be Django format, i.e. `profile__display_name`

        :return: list of field used to search user
        :rtype: list
        """
        return self.filtered_field_names

    def get_lookup_queryset(self, value):
        """
        Return filtered queryset to search users.

        :param value: Value to search
        :return: queryset to find user
        :rtype: django.db.models.QuerySet
        """
        return get_user_model().objects.filter(
            Q(username__exact=value) |
            Q(display_name__exact=value) |
            (
                Q(emails__email__exact=value) & Q(emails__is_verified=True)
            )
        )

    def validate(self, attrs):
        """
        Perform custom validation on serializer by injecting user instance into `user` key.

        :param attrs: dict of validated values
        :return: dict with injected `user` key
        :rtype: dict
        """
        lookup_name = attrs['lookup_value']
        user = self.get_lookup_queryset(lookup_name).first()
        attrs['user'] = user
        return attrs

    def create(self, validated_data):
        user = validated_data['user']
        if user is None:
            # prevention of user guest
            time.sleep(random.randint(150, 250) / 1000)
            user = AnonymousUser
        else:
            self.process_user(user)
        return user

    def process_user(self, user):
        """
        Method used to prepare key, generate email and send it to user

        :param user: User instance to send an email with link
        """
        key, exp = self.generate_key(user)
        email = user.email
        expiration_date = normalize_date_from_unix_timestamp(exp, user)

        self.logger.info('Sending UserPasswordResetRequestSignal')
        UserPasswordResetRequestSignal.send(
            sender=self.__class__,
            user=user,
            email=email,
            key=key,
            expiration_date=expiration_date,
            msg_id=self.logger.request_msg_id
        )

    def generate_key(self, user):
        """
        Used to create key for password reset.
        :param user: User instance
        :return: generated key and expiration time as unix timestamp
        :rtype: (str, int)
        """
        serializer = self.key_serializer(data={'user': user.pk}, context=self.context)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data['key'], int(serializer.validated_data['obj'].validated_data['e'])


class NewPasswordSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    """
    This serializer is being used to validate key received after user click in email link and add new password.
    """
    key = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password, ])

    def validate(self, attrs):
        """
        Used to validate key, inject user instance only if it pass them.
        :param attrs: 
        :return: 
        """
        s = PasswordKeyEncoderSerializer(data=attrs, context=self.context)
        s.is_valid(False)
        if s.errors:
            self.logger.info('User send wrong key: {}'.format(s.errors))
            raise ValidationError({'key': ['Key is invalid']})
        attrs['user'] = s.validated_data['user']
        return attrs

    def create(self, validated_data):
        user = validated_data['user']
        password = validated_data['new_password']
        user.set_password(password)
        user.save(update_fields=["password"])
        self.logger.info('Successfully changed password for user: {} by KEY'.format(user))
        return user


class ResetPasswordForLoggedUser(LoggingSerializerMixing, ReadOnlySerializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate(self, attrs):
        user = self.context.get('request').user
        if not isinstance(user, CustomUser):
            raise serializers.ValidationError({'non_field_errors': 'You must be logged in to perform this action'})
        if not user.check_password(attrs.pop('old_password')):
            raise serializers.ValidationError({'old_password': 'Wrong password'})
        return attrs

    def create(self, validated_data):
        user = self.context.get('request').user
        new_password = validated_data.pop('new_password')
        user.set_password(new_password)
        user.save(update_fields=["password"])
        self.logger.info('Successfully changed password for user: {} by API'.format(user))
        return user
