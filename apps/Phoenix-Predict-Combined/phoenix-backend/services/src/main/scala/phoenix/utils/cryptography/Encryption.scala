package phoenix.utils.cryptography

import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.security.spec.KeySpec
import java.util.Base64

import scala.util.Try

import cats.syntax.either._
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

final case class UnencryptedText(value: String)
final case class EncryptedResult(value: String)
final case class EncryptionPassword(value: String)

// Heavily "inspired" on https://mkyong.com/java/java-aes-encryption-and-decryption/.
object Encryption {
  private val ENCRYPT_ALGORITHM = "AES/GCM/NoPadding"
  private val TAG_LENGTH_BIT = 128 // must be one of {128, 120, 112, 104, 96}
  private val IV_LENGTH_BYTE = 12
  private val SALT_LENGTH_BYTE = 16
  private val charset = StandardCharsets.UTF_8
  private val secureRandom = new SecureRandom()
  private val secretKeyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")

  def encrypt(text: UnencryptedText, password: EncryptionPassword): EncryptedResult = {
    val salt = generateRandomNonce(SALT_LENGTH_BYTE)
    val iv = generateRandomNonce(IV_LENGTH_BYTE)
    val aesKeyFromPassword = getAESKeyFromPassword(password, salt)

    val cipher = Cipher.getInstance(ENCRYPT_ALGORITHM)
    cipher.init(Cipher.ENCRYPT_MODE, aesKeyFromPassword, new GCMParameterSpec(TAG_LENGTH_BIT, iv))

    val cipherTextWithoutIvSalt = cipher.doFinal(text.value.getBytes(charset))

    val cipherTextWithIvSalt =
      ByteBuffer
        .allocate(iv.length + salt.length + cipherTextWithoutIvSalt.length)
        .put(iv)
        .put(salt)
        .put(cipherTextWithoutIvSalt)
        .array()

    EncryptedResult(Base64.getEncoder.encodeToString(cipherTextWithIvSalt))
  }

  def decrypt(
      encryptedText: EncryptedResult,
      password: EncryptionPassword): Either[DecryptionFailure, UnencryptedText] = {
    Try {
      val decode = Base64.getDecoder.decode(encryptedText.value.getBytes(charset))
      val byteBuffer = ByteBuffer.wrap(decode)

      val iv = new Array[Byte](IV_LENGTH_BYTE)
      byteBuffer.get(iv)

      val salt = new Array[Byte](SALT_LENGTH_BYTE)
      byteBuffer.get(salt)

      val cipherText = new Array[Byte](byteBuffer.remaining())
      byteBuffer.get(cipherText)

      val aesKeyFromPassword = getAESKeyFromPassword(password, salt)

      val cipher = Cipher.getInstance(ENCRYPT_ALGORITHM)
      cipher.init(Cipher.DECRYPT_MODE, aesKeyFromPassword, new GCMParameterSpec(TAG_LENGTH_BIT, iv))

      val plainTextAsBytes = cipher.doFinal(cipherText)
      UnencryptedText(new String(plainTextAsBytes, charset))
    }.toEither.leftMap(DecryptionFailure)
  }

  private def generateRandomNonce(numBytes: Int): Array[Byte] = {
    val nonce = new Array[Byte](numBytes)
    secureRandom.nextBytes(nonce)
    nonce
  }

  def getAESKeyFromPassword(password: EncryptionPassword, salt: Array[Byte]): SecretKey = {
    val iterationCount = 65536
    val keyLength = 256
    val spec: KeySpec = new PBEKeySpec(password.value.toCharArray, salt, iterationCount, keyLength)
    new SecretKeySpec(secretKeyFactory.generateSecret(spec).getEncoded, "AES")
  }
}

final case class DecryptionFailure(underlying: Throwable) extends RuntimeException(underlying)
