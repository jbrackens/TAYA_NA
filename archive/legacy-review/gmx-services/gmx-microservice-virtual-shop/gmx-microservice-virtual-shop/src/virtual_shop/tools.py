import datetime
import enum
import logging
from decimal import Decimal
from typing import Tuple
from uuid import uuid4

from aws_rest_default import settings as aws_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.http import HttpRequest
from requests import RequestException
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from services.pc_service import PcService

logger = logging.getLogger(__name__)
META_MESSAGE_HEADER_NAME = None


class ARN:
    @staticmethod
    def avro_schema(subject: str) -> str:
        return "arn:avro:schema:{}".format(subject)


class SpecialProductTypeEnum(enum.Enum):
    CHARITY = "CHARITY"
    BEST_ODDS_GUARANT = "BEST_ODDS_GUARANT"


def get_member_upload_to(instance, filename):
    return "photos/{}/{}." "{}".format(instance.uid, uuid4(), filename.split(".")[-1])


def get_or_create_user(user_sub):
    """
    Method in which program decide either log in user or create new user.

    :param user_sub: [:class: `str`] user_sub taken from id_token payload
    :return: user [:class: `django.db.models.base.ModelBase`]
    """
    model = get_user_model()
    user = model.objects.filter(username=user_sub).first()
    if user is None:
        with cache.lock("user:creation:{}".format(user_sub)):
            user = model.objects.filter(username=user_sub).first()
            if user is None:
                sid = transaction.savepoint()
                user = model.objects.create_user(username=user_sub)
                transaction.savepoint_commit(sid)
    return user


def pc_service_validate_token(sb_token: str, api_request: str = None) -> Tuple[str, str]:
    """
    Method used to get `user_sub` from PcService.exchange_sb_token_for_user class-method.
    :param sb_token:
    :param api_request:
    :return: user_sub:
    """

    try:
        response = PcService().exchange_sb_token_for_user(sb_token=sb_token, api_request=api_request)

    except RequestException as e:
        if e.response:
            if e.response.status_code == 400:
                msg = "Connection error while getting external user configurations:{}".format(e.response.json())
            elif e.response.status_code == 403:
                msg = "Permission Denied"
            else:
                msg = "Can not get Users details:{}".format(e)
        else:
            msg = "ConnectionError: Some of combined Micro-Services are unavailable. {}".format(e)
        logger.error(msg)
        raise serializers.ValidationError({"error": msg})

    except Exception as e:
        msg = "Critical unknown error {}. Contact administrator.".format(e)
        logger.error(msg)
        raise serializers.ValidationError({"error": msg})

    user_sub = response.get("user_sub")

    return user_sub


def pc_service_get_user_current_balance(sb_token: str, api_request: str = None) -> Decimal:
    """
    Method used to get `current_balance` from PcService.exchange_sb_token_for_user_current_balance class-method.
    :param sb_token:
    :param api_request:
    :return: current_balance:
    """

    try:
        response = PcService().exchange_sb_token_for_user_current_balance(sb_token=sb_token, api_request=api_request)

    except RequestException as e:
        if e.response:
            if e.response.status_code == 400:
                msg = "Connection error while getting external user configurations:{}".format(e.response.json())
            elif e.response.status_code == 403:
                msg = "Permission Denied"
            else:
                msg = "Can not get Users details:{}".format(e)
        else:
            msg = "ConnectionError: Some of combined Micro-Services are unavailable. {}".format(e)
        logger.error(msg)
        raise serializers.ValidationError({"error": msg})

    except Exception as e:
        msg = "Critical unknown error {}. Contact administrator.".format(e)
        logger.error(msg)
        raise serializers.ValidationError({"error": msg})

    current_balance = response.get("current_balance")

    return current_balance


def pc_service_payment(sb_token: str, price, title: str, order_uid: str, pc_endpoint: str, api_request: str = None):
    """
    Method used to get reguest payment to PcService.virtual_shop_payment class-method.

    :param sb_token:
    :param price:
    :param title:
    :param order_uid:
    :param pc_endpoint
    :param api_request
    :return: user_sub:
    """
    try:
        response = PcService().virtual_shop_payment(
            sb_token=sb_token,
            price=price,
            title=title,
            order_uid=order_uid,
            pc_endpoint=pc_endpoint,
            api_request=api_request,
        )

    except RequestException as e:
        if e.response.status_code == 400:
            if e.response.json().get("error_type") == "INSUFFICIENT_FOUNDS":
                msg = "INSUFFICIENT_FOUNDS"
            else:
                msg = "Connection error while requesting payment:{}".format(e.response.json())
        elif e.response.status_code == 403:
            msg = "Permission Denied: Payment"
        else:
            msg = "Payment Error:{}".format(e)
        logger.error(msg)
        raise serializers.ValidationError({"error": msg})
    except Exception as e:
        msg = "Critical unknown error: {}. Contact administrator.".format(e)
        logger.error(msg)
        raise serializers.ValidationError({"error": msg})

    # user_sub = response.get('user_sub')
    process_id = response.get("process_id")
    external_user_id = response.get("external_user_id")

    return process_id, external_user_id


def get_message_id_from_request(request: HttpRequest) -> str:
    """
    Extracting RMX request ID from headers.
    :param request: Django request object
    :return FS-Api-Message-Id header value
    """
    global META_MESSAGE_HEADER_NAME
    if META_MESSAGE_HEADER_NAME is None:
        META_MESSAGE_HEADER_NAME = aws_settings.get("META_MESSAGE_HEADER_NAME")
    request_id = request.META.get(META_MESSAGE_HEADER_NAME, "unknown")
    return request_id


def validate_datetime_value(datetime_value):
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            return datetime.datetime.strptime(datetime_value, fmt)
        except ValueError:
            pass
    logger.exception("Wrong date: {}".format(datetime_value))
    raise ValidationError(
        {"date": ["Wrong date format: {}. Check if date is in format:YYYY-MM-DD HH:MM:SS".format(datetime_value)]}
    )


def common_member(a, b):
    a_set = set(a or list())
    b_set = set(b or list())
    if a_set & b_set:
        msg = "Duplication find in array. Double points update prevented!" " \n Please contact Administrator. "
        logger.exception(msg)
        raise ValidationError({"resolved lines array": msg})
    else:
        return False
