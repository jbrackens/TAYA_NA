from aws_rest_default.serializers import ReadOnlySerializer, LoggingSerializerMixing
from aws_rest_default.tools import decrypt_b64
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from oidc_rest.serializers import EmailKeyGenerator, EmailKeyObjectSerializer
from oidc_signals.signals import UserAddEmailSignal
from profiles import models as profile_models


class AddEmailSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    email = serializers.EmailField()

    def create(self, validated_data):
        self.logger.info('Sending UserAddEmailSignal')

        user = validated_data.get('user')
        email = validated_data.get('email')
        key, expiration_date = EmailKeyGenerator.get_key_and_expiration_date(user, email)

        UserAddEmailSignal.send(
            sender=self.__class__,
            user=user,
            email=email,
            key=key,
            expiration_date=expiration_date,
            msg_id=self.logger.request_msg_id
        )
        return user


class VerifyEmailSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    key = serializers.CharField(write_only=True)

    def decode_key(self, key):
        """
        Function used to decrypt KEY and return user and email
        :param key: key to decrypt
        :type key: str
        :return: EmailKeyObjectSerializer
        """
        try:
            data = decrypt_b64(key)
        except Exception:
            raise serializers.ValidationError('Error during decoding key')
        key_serializer = EmailKeyObjectSerializer(data=data)
        if not key_serializer.is_valid(raise_exception=False):
            raise serializers.ValidationError('Error during decoding key')

        return key_serializer

    def validate(self, attrs):
        """
        When `key` is passed during initialization, validate decodes it and creates user and email fields.
        When `user` and `email` have been passed during initialization then key is being created

        :param attrs: validated dict
        :type attrs: dict
        :return: dict
        """
        key = attrs.get('key')

        key_obj = self.decode_key(key=key)
        attrs['obj'] = key_obj
        user, email = key_obj.data['u'], key_obj.data['e']
        self.logger.info('Decoded EmailValidation key for {} and {}'.format(user, email))
        email_instance = profile_models.Email.objects.filter(email__exact=email).only('user_id', 'is_verified').first()

        if email_instance:
            if email_instance.user_id != user:
                self.logger.error('Detected Email validation but different user already have this email! (Key="{}" (user="{}") Email="{}" (user="{}", is_verified="{}", is_primary={})'.format(key, user, email, email_instance.user, email_instance.is_verified, email_instance.is_primary))
                raise serializers.ValidationError({'key': serializers.ValidationError('Key invalid')})
            if email_instance.is_verified:
                self.logger.error('email already Verified - {}'.format(email_instance))
                raise serializers.ValidationError({'key': serializers.ValidationError('Key already used')})

            attrs['email_instance'] = email_instance
        else:
            attrs['user'] = user
            attrs['email'] = email
        return attrs

    def create(self, validated_data):
        """
        If "email_instance" found in "validated_data" then sets it as verified email
        """
        email_instance = validated_data.pop('email_instance', None)
        if email_instance is None:
            user = validated_data.pop('user')
            email = validated_data.pop('email')
            email_instance = profile_models.Email(email=email, user_id=user)
            try:
                email_instance.full_clean()
            except DjangoValidationError as e:
                self.logger.error('Unable to create Email Instance (user={}, email={}) because: {}'.format(user, email, e))
                raise serializers.ValidationError({'key': serializers.ValidationError('Problem with email and key.')})
            email_instance.save()
        email_instance.set_verified()
        self.logger.info('Email {} set as verified'.format(email_instance))
        if email_instance.user.is_limited:
            email_instance.user.activate_user()
            self.logger.info('User {} activated and limitations are off'.format(email_instance.user))
        return email_instance
