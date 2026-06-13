import logging
from time import time

import nacl.encoding
import nacl.secret
import ujson as json

from gmx_nifi_rest import settings
from gmx_nifi_rest.services import BaseService

logger = logging.getLogger(__name__)


class SecretBoxService(BaseService):
    _secret_box: nacl.secret.SecretBox = None

    @classmethod
    async def initialize(cls):
        cls._secret_box = nacl.secret.SecretBox(key=settings.JWT_EXTRA_SECRET_KEY)

    @classmethod
    async def deinitialize(cls):
        pass

    @classmethod
    def encrypt_b64(cls, obj_to_encrypt) -> str:
        """
        Function is widely used across services to encrypt (dict, list, tuple, str, bytes) objects.

        :param obj_to_encrypt: Object to encrypt
        :type obj_to_encrypt: dict, list, tuple, str, bytes
        :return: encrypted string
        :rtype: str
        """
        if isinstance(obj_to_encrypt, (dict, list, tuple, int, float)):
            obj_to_encrypt = json.dumps(obj_to_encrypt)
        if isinstance(obj_to_encrypt, str):
            obj_to_encrypt = obj_to_encrypt.encode()
        if not isinstance(obj_to_encrypt, bytes):
            raise TypeError("Unhandled type of object passed to encrypt function: {}".format(type(obj_to_encrypt)))
        return (
            cls._secret_box.encrypt(plaintext=obj_to_encrypt, encoder=nacl.encoding.URLSafeBase64Encoder)
            .decode()
            .rstrip("=")
        )

    @classmethod
    def decrypt_b64(cls, ciphertext):
        """
        Function used to decrypt URLsafeBase64 + Ed25519 encrypted object
        :param ciphertext: message to decrypt
        :type ciphertext: str, bytes
        :return: decoded object
        :rtype: dict, list, str, int, float
        """
        if isinstance(ciphertext, str):
            ciphertext = ciphertext.encode()
        if not isinstance(ciphertext, bytes):
            raise TypeError("Unhandled type of object passed to decrypt function: {}".format(type(ciphertext)))
        missing_padding = len(ciphertext) % 4
        if missing_padding:
            ciphertext += b"=" * (4 - missing_padding)

        result = cls._secret_box.decrypt(ciphertext=ciphertext, encoder=nacl.encoding.URLSafeBase64Encoder).decode()
        try:
            json_obj = json.loads(result)
        except ValueError:
            return result
        if isinstance(json_obj, str):
            return result
        return json_obj

    @classmethod
    def calculate_payment_token(
        cls, valid_time: int, company_id: str, user_sub: str, external_user_id: str, first_name: str
    ) -> str:
        """
        :param valid_time: how long token is valid
        :param first_name: Display name from SbTech response
        :param external_user_id: SbTech user id
        :param user_sub:  RMX user SUB
        :param company_id:  Company ID as UUID from OIDC
        :return: Silent Payment Token for Initial Rewards
        """
        return cls.encrypt_b64(
            {"u": user_sub, "e": int(time()) + valid_time, "d": first_name, "c": company_id, "x": external_user_id}
        )
