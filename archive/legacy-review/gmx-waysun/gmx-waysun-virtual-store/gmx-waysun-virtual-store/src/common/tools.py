import time
from typing import Any

import ujson as json
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from nacl import encoding as nacl_encoding
from nacl import secret as nacl_secret
from nacl.exceptions import CryptoError
from rest_framework.exceptions import ValidationError as DrfValidationError


class SECRET_BOX:  # noqa
    def __init__(self):
        self._secret_box = nacl_secret.SecretBox(
            key=settings.SECRET_BOX_KEY,
        )
        self._encoder = nacl_encoding.URLSafeBase64Encoder()

    def encrypt(self, obj: Any) -> str:
        data = (obj, int(time.time()))
        js_str: str = json.encode(data)
        js_bytes: bytes = js_str.encode()
        cipher: bytes = self._secret_box.encrypt(js_bytes)
        cipher_encoded: bytes = self._encoder.encode(cipher)
        return cipher_encoded.decode().rstrip("=")

    def decrypt(self, cipher: str, max_age: int = None) -> Any:
        """
        Method used to decrypt cipher with optional time age checking
        :param cipher: Cipher string to decode
        :param max_age: (optional) When greater than zero, function will check
                        against expiration and when message has been encrypted
                        to far ago then a CryptoError will be thrown.
        :return: decoded payload
        """
        c_bytes = cipher.encode() + b"==="
        cipher_raw: bytes = self._encoder.decode(c_bytes)
        js_bytes: bytes = self._secret_box.decrypt(cipher_raw)
        js_str: str = js_bytes.decode()
        data = json.decode(js_str)
        obj, sign_date = data
        if max_age:
            assert max_age > 0
            if sign_date + max_age < int(time.time()):
                raise CryptoError(f"Data expired over {int(time.time())-max_age-sign_date} seconds.")
        return obj


SECRET_BOX = SECRET_BOX()


def drf_validate_password(*args, **kwargs):
    try:
        validate_password(*args, **kwargs)
    except DjangoValidationError as e:
        raise DrfValidationError(e)
