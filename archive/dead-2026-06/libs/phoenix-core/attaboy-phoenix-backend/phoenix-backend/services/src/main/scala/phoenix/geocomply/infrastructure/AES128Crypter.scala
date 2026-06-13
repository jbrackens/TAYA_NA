package phoenix.geocomply.infrastructure

import cats.syntax.either._
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import org.apache.commons.codec.binary.Base64
import org.apache.commons.codec.binary.Hex
import org.slf4j.LoggerFactory

import phoenix.geocomply.domain.Crypter
import phoenix.geocomply.domain.Crypter.FailedToDecrypt
import phoenix.geocomply.domain.Crypter.FailedToEncrypt
import phoenix.geocomply.domain.Decryption.DecryptionInitializationVector
import phoenix.geocomply.domain.Decryption.DecryptionKey

private[geocomply] final class AES128Crypter(
    decryptionInitializationVector: DecryptionInitializationVector,
    decryptionKey: DecryptionKey)
    extends Crypter {

  private val log = LoggerFactory.getLogger(getClass)

  private val initializationVector = new IvParameterSpec(
    Hex.decodeHex(decryptionInitializationVector.value.toCharArray))
  private val secretKey = new SecretKeySpec(Hex.decodeHex(decryptionKey.value.toCharArray), "AES")

  private val decodeCipher = Cipher.getInstance("AES/CBC/PKCS5PADDING")
  decodeCipher.init(Cipher.DECRYPT_MODE, secretKey, initializationVector)

  private val encodeCipher = Cipher.getInstance("AES/CBC/PKCS5PADDING")
  encodeCipher.init(Cipher.ENCRYPT_MODE, secretKey, initializationVector)

  def decrypt(input: String): Either[FailedToDecrypt.type, String] =
    try {
      new String(decodeCipher.doFinal(Base64.decodeBase64(input))).asRight
    } catch {
      case e: Exception =>
        log.warn(s"Failed to decrypt input: $input", e)
        FailedToDecrypt.asLeft
    }

  override def encrypt(input: String): Either[Crypter.FailedToEncrypt.type, String] =
    try {
      Base64.encodeBase64String(encodeCipher.doFinal(input.getBytes)).asRight
    } catch {
      case e: Exception =>
        log.warn(s"Failed to encrypt input: $input", e)
        FailedToEncrypt.asLeft
    }
}
