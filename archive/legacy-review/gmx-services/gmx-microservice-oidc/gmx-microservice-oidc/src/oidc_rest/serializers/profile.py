from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from phonenumber_field.validators import validate_international_phonenumber
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

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

        if 'request' in self.context:
            request = self.context.get('request')
        elif 'view' in self.context:
            request = self.context.get('view').request
        else:
            raise serializers.ValidationError('Unable to inject "user". Does user is logged in ?')
        user = request.user
        if user.is_authenticated:
            data['user'] = user
        else:
            raise serializers.ValidationError('User is not authenticated!')
        data['is_verified'] = False
        return data

    def create(self, validated_data):
        """
        Creates model instance with `is_primary` flag sets to False
        :param validated_data: cleaned serializer data
        :type validated_data: dict
        :return: model instance
        """
        validated_data['is_primary'] = False
        instance = self.Meta.model(**validated_data)
        instance = self._model_clean_and_save(instance)
        self.logger.info('{}: Created {}'.format(instance.__class__.__name__, instance))
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
        is_primary = validated_data.pop('is_primary')

        if not instance.is_primary and is_primary:
            self.logger.info('{}: Setting instance as Primary: {}'.format(instance.__class__.__name__, instance))
            try:
                instance.set_as_primary()
            except DjangoValidationError as e:
                raise serializers.ValidationError({'non_field_errors': e.messages})
            return instance

        if instance.is_verified:
            self.logger.warning('{}: Blocking edit on validated instance of {}'.format(instance.__class__.__name__, instance))
            raise serializers.ValidationError('Editing validated entity is prohibited.')

        del validated_data['is_verified']
        del validated_data['user']

        update_fields = []

        for key, value in validated_data.items():
            if getattr(instance, key) != value:
                update_fields.append(key)
                setattr(instance, key, value)

        if update_fields:
            instance.save(update_fields=update_fields)
            # noinspection PyUnresolvedReferences
            self.logger.info('{}: Updated fields: {}'.format(instance.__class__.__name__, update_fields))
        else:
            # noinspection PyUnresolvedReferences
            self.logger.info('{}: Nothing to do. Exiting.'.format(instance.__class__.__name__))

        return instance


class EmailSerializer(PrimaryAndVerifiedSerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Email Serializer
    """

    class Meta:
        model = models.Email
        exclude = ('user',)
        read_only_fields = ('id', 'is_verified') + exclude

    def create(self, validated_data):
        raise NotImplementedError('Please use AddEmailSerializer instead of EmailSerializer!')


class PhoneSerializer(PrimaryAndVerifiedSerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Phone Serializer
    """
    phone_number = serializers.CharField()

    def validate_phone_number(self, value):
        try:
            validate_international_phonenumber(value)
        except DjangoValidationError as e:
            raise ValidationError(e.messages)
        return value

    class Meta:
        model = models.Phone
        exclude = ('user',)
        read_only_fields = ('id', 'is_verified') + exclude


class AddressSerializer(PrimaryAndVerifiedSerializerMixing, LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Address Serializer
    """

    class Meta:
        model = models.Address
        exclude = ('user',)
        read_only_fields = ('id', 'is_verified') + exclude

        extra_kwargs = {
            'line_2': {'required': False},
            'region': {'required': False},
        }


class CompanySerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    def create(self, validated_data):
        """Create not allowed"""
        pass

    def update(self, instance, validated_data):
        """Update not allowed"""
        pass

    class Meta:
        model = models.Company
        fields = '__all__'
        read_only_fields = ('__all__',)


class ProfileSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    """
    Profile Model serializer"
    """
    company = CompanySerializer(required=False, read_only=True)
    email = serializers.EmailField(read_only=True)
    originator = CompanySerializer(required=False, source='get_originator_company', read_only=True)

    class Meta:
        model = models.CustomUser
        exclude = ('oidc_permissions', 'password', 'groups', 'user_permissions', 'is_superuser', 'is_staff', 'is_company', 'id')
        read_only_fields = (
                               'id',
                               'sub',
                               'username',
                               'email',
                               'date_of_birth_verified',
                               'originator',
                               'company',
                               'is_staff',
                               'is_company',
                               'is_active',
                               'is_limited',
                               'date_joined',
                               'updated_at',
                               'is_superuser',
                           ) + exclude


class UserLastSeenSerializer(ReadOnlySerializer, LoggingSerializerMixing):
    """
    Serializer used to `touch` last_seen field on user
    """
    username = serializers.CharField(max_length=36, min_length=36)
    updated = serializers.BooleanField(read_only=True)

    # validation skipped for optimization

    def create(self, validated_data):
        user_sub = validated_data.get('username')
        result = models.CustomUser.objects.filter(sub=user_sub).update(last_login=timezone.now())
        return {
            'username': user_sub,
            'updated': (result > 0)
        }
