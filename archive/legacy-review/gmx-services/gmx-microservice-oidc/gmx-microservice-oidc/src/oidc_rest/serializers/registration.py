import uuid

from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from oidc_provider.models import Client
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from oidc_rest.serializers import EmailKeyGenerator
from oidc_rest.validators import validate_password
from oidc_signals.signals import UserRegisteredSignal
from profiles import models


class RegistrationSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    originators_client_id = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField()
    username = serializers.CharField(validators=[UniqueValidator(queryset=models.CustomUser.objects.all())], default=lambda: uuid.uuid4().hex)
    password = serializers.CharField(validators=[validate_password], write_only=True)

    def validate_email(self, value):
        """
        This is a validator for email . It ignores temp users
        :param value:
        :return:
        """
        value = value.strip().lower()
        try:
            validate_email(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message)

        if models.Email.objects.filter(email=value, user__is_temporary=False).exists():
            raise serializers.ValidationError('Email already registered')
        return value

    def validate(self, attrs):
        """
        Specially putted here to hide exception informing that client_id is known or not.

        Injecting:

         - `originators_client_pk`  - OIDC Client PK
         - `originators_pk` - OIDC User related with client

        :param attrs: dict of values from serializer
        :type attrs dict
        :return: cleaned values
        :rtype: dict
        """
        errors = []
        client = Client.objects.filter(client_id=attrs['originators_client_id']).only('id', 'extra__user_id').first()
        if client is None:
            errors.append('Unable to register user due to input validation error')
        else:
            attrs['originators_client_pk'] = client.id
            attrs['originators_pk'] = client.extra.user.pk
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        """
        Creates user in DB. Only. Activation emails etc should be added as signal handlers.
        As additional parameter, i.e. during save method, you can pass:
        - `skip_signal_sending` parameter to prevent generating key and sending UserRegisteredSignal signal.
        - `is_temporary` parameter to set user as temporary (used for external partners).

        :param validated_data: Valid and clean data from serializer
        :type validated_data: dict

        :return: User instance
        :rtype: models.CustomUser
        """
        username = validated_data['username']
        email = validated_data['email']
        originator_id = validated_data['originators_pk']
        password = validated_data['password']
        first_name = validated_data.get('first_name', '')
        skip_signal_sending = validated_data.get('skip_signal_sending', False)
        is_temporary = validated_data.get('is_temporary', False)

        # I must check for temporary user.. if user is temporary i will skip it creation and set password
        user = models.CustomUser.objects.filter(
            emails__email=email,
            is_temporary=True
        ).first()
        if user:
            user.username = username
            user.first_name = first_name
            user.set_password(password)
            user.is_temporary = is_temporary
            user.save()
        else:
            self.logger.info('Creating user ({}) originated by client_id={}'.format(email, validated_data['originators_client_id']))

            user = models.CustomUser.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                originator_id=originator_id,
                is_temporary=is_temporary
            )
        if not skip_signal_sending:
            self._send_signal(user, email)

        return user

    def _send_signal(self, user, email):
        self.logger.info('Sending signal: UserRegisteredSignal')
        key, expiration_date = EmailKeyGenerator.get_key_and_expiration_date(user, email)
        UserRegisteredSignal.send(
            sender=self.__class__,
            user=user,
            email=email,
            key=key,
            expiration_date=expiration_date,
            msg_id=self.logger.request_msg_id
        )
