package phoenix.geocomply.infrastructure

import java.security.InvalidAlgorithmParameterException
import java.security.InvalidKeyException

import org.apache.commons.codec.DecoderException
import org.apache.commons.codec.binary.Hex
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.geocomply.domain.Crypter.FailedToDecrypt
import phoenix.geocomply.domain.Decryption.DecryptionInitializationVector
import phoenix.geocomply.domain.Decryption.DecryptionKey

final class AES128CrypterSpec extends AnyWordSpecLike with Matchers {

  private val decryptionIV = new String(Hex.encodeHex("someLongVector..".getBytes))
  private val decryptionKey = new String(Hex.encodeHex("andStrongKey!!!!".getBytes))

  val objectUnderTest = new AES128Crypter(DecryptionInitializationVector(decryptionIV), DecryptionKey(decryptionKey))

  private val encryptedString =
    "sw4xjcEL3mPXD6HyvKa3ADTj6oUbqBp5ZX/sbHaRjzOkDU0oGgxsbIZ4kxOFcruv82+fg5tnMZeqZlDM8+iF9GgYyhJHZW3JD+M5dXcWFzqLmYn5cE3rXua6wBk1LtLGfTSn0cXCjPjJ9txrNXnf0jU/1CCCYHyV0rW7A90mzSYMFVs8wcRpehcT6D6OcMNK8KVgU23J1pAxeDSYPw1uu6medPE20k+siqOeMLQJXkgnELayMMCy4YZldd4N6wp9CjKz3ZIJQhaetavxc8Tss18aL8wkcXKYPkB6R79zJTCuUPv+hJX473ZSeKIiazxTdqhOJ8H4/B1/3j1bqkt3zi+tGMb+XpAou18kLH/OGCP3gPQiP+VacSyTLr+FrFQRlAyT1xCfECOJGc+etpac0RoxoUqYBVWKMPrbwyzUVuibS+ZGkqm+G6VZieeGA1si8XPOlcwR1Vifsw8g7u1XpHdZ3KfG/6Znha+xpkIR8stFOaOWgTi8WRR/xjTZN5zn"

  private val decryptedString =
    """
      |<?xml version="1.0" encoding="UTF-8"?>
      |<nodes>
      | <gc_transaction>0e2764f99f2b04f6</gc_transaction>
      | <error_code>1</error_code>
      | <error_message>boundary</error_message>
      | <error_details>
      |   <boundary type="no_data" description="No coordinates were provided"/>
      | </error_details>
      | <error_summary>
      |   <unconfirm_boundary>1</unconfirm_boundary>
      | </error_summary>
      | ......
      |</nodes>
      |""".stripMargin

  "An AES128Decryptor" when {
    "decrypt" should {
      "succeed given correct encryptedString and decryption parameters" in {
        val decrypted = objectUnderTest.decrypt(encryptedString)

        decrypted should be(Right(decryptedString))
      }
      "fail given malformed encryptedString" in {
        val decrypted = objectUnderTest.decrypt("notCorrectString")

        decrypted should be(Left(FailedToDecrypt))
      }
      "fail given not matching decryption parameters" in {
        val decryptor = new AES128Crypter(
          DecryptionInitializationVector(decryptionIV),
          DecryptionKey(new String(Hex.encodeHex("notMatchingKey:(".getBytes))))

        val decrypted = decryptor.decrypt(encryptedString)

        decrypted should be(Left(FailedToDecrypt))
      }
    }

    "encrypt" should {
      "succeed" in {
        val encrypted = objectUnderTest.encrypt(decryptedString)

        encrypted should be(Right(encryptedString))
      }
    }

    "initialized" should {
      "fail given short key" in {
        assertThrows[InvalidKeyException] {
          new AES128Crypter(
            DecryptionInitializationVector(decryptionIV),
            DecryptionKey(new String(Hex.encodeHex("badKey".getBytes))))
        }
      }
      "fail given not hex key" in {
        assertThrows[DecoderException] {
          new AES128Crypter(
            DecryptionInitializationVector(decryptionIV),
            DecryptionKey("[i-should-have-been-injected-from-env]"))
        }
      }
      "fail given short IV" in {
        assertThrows[InvalidAlgorithmParameterException] {
          new AES128Crypter(
            DecryptionInitializationVector(new String(Hex.encodeHex("badIV".getBytes))),
            DecryptionKey(decryptionKey))
        }
      }
      "fail given not hex IV" in {
        assertThrows[DecoderException] {
          new AES128Crypter(
            DecryptionInitializationVector("[i-should-have-been-injected-from-env]"),
            DecryptionKey(decryptionKey))
        }
      }
    }
  }
}
