import logging
import time
from uuid import uuid4

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction

from common.tools import SECRET_BOX

from . import models

logger = logging.getLogger(__name__)
META_MESSAGE_HEADER_NAME = None


def get_member_upload_to(instance, filename):
    return "photos/{}/{}." "{}".format(instance.sub, uuid4(), filename.split(".")[-1])


def create_antstream_token(user_sub: str) -> str:
    timestamp_now = int(time.time())
    antstream_model = models.AntstreamModel.objects.first()
    antstream_token = jwt.encode(
        {
            "exp": timestamp_now + settings.ANTSTREAM_TOKEN_EXPIRATION_MINUTES,
            "nbf": timestamp_now,
            "iat": timestamp_now,
            "sub": user_sub,
            "aud": antstream_model.oidc_client_extra.oidc_client.client_id,
        },
        antstream_model.rsa_key.key,
        algorithm="RS256",
        headers={"alg": "RS256", "kid": antstream_model.rsa_key.kid},
    )
    return antstream_token.decode()


def create_order_token(user_sub: str) -> str:
    return SECRET_BOX.encrypt(user_sub)


def decrypt_order_token(cipher: str, max_age: int = None) -> str:
    return SECRET_BOX.decrypt(cipher=cipher, max_age=max_age)


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
