import time
import warnings
from typing import Tuple
from uuid import UUID

import jwt
from django.conf import settings

from common.tools import SECRET_BOX

from . import models


def create_antstream_token(user_sub: str) -> str:
    timestamp_now = int(time.time())
    antstream_model = models.AntstreamModel.objects.first()
    token_data = {
        "exp": timestamp_now + settings.ANTSTREAM_TOKEN_EXPIRATION_MINUTES,
        "nbf": timestamp_now,
        "iat": timestamp_now,
        "sub": user_sub,
        "aud": antstream_model.oidc_client_extra.oidc_client.client_id,
    }
    _key = antstream_model.rsa_key.key
    _kid = antstream_model.rsa_key.kid
    antstream_token = jwt.encode(
        token_data,
        _key,
        algorithm="RS256",
        headers={"alg": "RS256", "kid": _kid},
    )
    return antstream_token.decode()


def create_order_token(
    user_sub: str, external_user_id: str, originator_sub: Tuple[str, UUID], is_test_user: bool = False
) -> str:
    if isinstance(originator_sub, UUID):
        originator_sub = str(originator_sub)
    return SECRET_BOX.encrypt(dict(u=user_sub, e=external_user_id, o=originator_sub, t=1 if is_test_user else 0))


def decrypt_order_token(cipher: str, max_age: int = None) -> str:
    warnings.warn("decrypt order token will be removed and it will be moved to VirtualShop", DeprecationWarning)
    return SECRET_BOX.decrypt(cipher=cipher, max_age=max_age).get("u")
