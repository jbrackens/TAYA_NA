import time

from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


def validate_password(password, user=None, password_validators=None):
    """
    A wrapper converting Django ValidateError to Rest type of ValidationError
    """
    try:
        django_validate_password(password, user=user, password_validators=password_validators)
    except DjangoValidationError as e:
        raise serializers.ValidationError(e.messages)


def future_validator(value):
    """
    Validator used in Key validation, checks if passed value is seconds from future
    :param value: unix time stamp
    :type value: int
    :raise ValidationError: when value is from past
    """
    if value < time.time():
        raise serializers.ValidationError('Key expired')
