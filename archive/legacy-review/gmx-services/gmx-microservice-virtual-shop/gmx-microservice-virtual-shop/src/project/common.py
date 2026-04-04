import base64
import logging

import nacl.encoding
import nacl.secret
from django.conf import settings

logger = logging.getLogger(__name__)


class SecretBoxBase64(nacl.secret.SecretBox):
    """
    SecretBoxBase class is used to encrypt/decrypt url in wallet history.
    The idea of that is not to show http address where we send requests in URL.

    """

    def encrypt(self, plaintext, nonce=None, encoder=nacl.encoding.URLSafeBase64Encoder):
        """
        encrypt method is used to encrypt string which is passed to this method using URLSafeBase64 encoder.

        :param plaintext: [:class: `str`] string to encrypted
        :param nonce: [:class: `str`] additional value used to encrypt
        :param encoder: [:class: `encoder`] encoder type used to encrypt data
        :return: result: [:class: `str`] encrypted data
        """
        if isinstance(plaintext, str):
            plaintext = plaintext.encode()
        result = super().encrypt(plaintext, nonce=nonce, encoder=encoder)
        if isinstance(result, bytes):
            result = result.decode()
        return result

    def decrypt(self, ciphertext, nonce=None, encoder=nacl.encoding.URLSafeBase64Encoder):
        """
        Opposite method to encrypt, data is decrypted to it's primary state.

        :param ciphertext: [:class: `str`,`byte`] data to be decrypted
        :param nonce: [:class: `str`] additional value used to decrypt, the same as in encrypt method
        :param encoder: [:class: `encoder`] encoder type used to decrypt data
        :return: result: [:class: `str`] decrypted data
        """
        result = super().decrypt(ciphertext, nonce=nonce, encoder=encoder)
        if isinstance(result, bytes):
            result = result.decode()
        return result


SecretBox = SecretBoxBase64(base64.decodebytes(settings.SECRET_BOX_KEY.encode()))
