import time
from datetime import datetime

import pytz
from aws_rest_default.serializers import ReadOnlySerializer
from aws_rest_default.tools import encrypt_b64
from django.contrib.auth import get_user_model
from rest_framework import serializers

from oidc_rest.validators import future_validator


class EmailKeyObjectSerializer(ReadOnlySerializer):
    """
    Dummy serializer used to generate special key to validate user's email
    """
    u = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())
    x = serializers.IntegerField(validators=[future_validator])
    e = serializers.EmailField()


def make_key_serializer(user, email, key_valid_time=60 * 60 * 2):
    """
    Function return encoded key for given input
    :param user: User instance
    :param email: email string
    :param key_valid_time: number of seconds when Key is valid (Default 2h)
    :type email: str
    :return: EmailKeyObjectSerializer
    :rtype: EmailKeyObjectSerializer
    """
    expiration_date = int(time.time()) + key_valid_time
    data = {
        'u': user.pk,
        'x': expiration_date,
        'e': email
    }
    key_serializer = EmailKeyObjectSerializer(data=data)
    if not key_serializer.is_valid(raise_exception=False):
        raise serializers.ValidationError('Error during creating key')

    return key_serializer


def normalize_date_from_unix_timestamp(exp, user):
    exp = float(exp)
    if user.timezone and user.timezone in pytz.all_timezones:
        timezone = pytz.timezone(user.timezone)
    else:
        timezone = pytz.timezone('GMT')
    expiration_date = datetime.fromtimestamp(exp, timezone)
    expiration_date = datetime.strftime(expiration_date, '%Y.%m.%d, %H:%M:%S (%z)')
    return expiration_date


class EmailKeyGenerator(object):
    @classmethod
    def get_key_and_expiration_date(cls, user, email):
        key_obj = make_key_serializer(user, email)
        key = encrypt_b64(key_obj.data)
        expiration_date = normalize_date_from_unix_timestamp(key_obj.validated_data['x'], user)

        return key, expiration_date
