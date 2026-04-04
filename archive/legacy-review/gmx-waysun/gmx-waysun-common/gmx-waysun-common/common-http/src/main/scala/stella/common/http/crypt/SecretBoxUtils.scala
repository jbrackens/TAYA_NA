package stella.common.http.crypt

import java.nio.charset.StandardCharsets
import java.util.Base64

import cats.syntax.either._
import com.goterl.lazysodium.LazySodium
import com.goterl.lazysodium.LazySodiumJava
import com.goterl.lazysodium.SodiumJava
import com.goterl.lazysodium.utils.Base64MessageEncoder
import com.goterl.lazysodium.utils.HexMessageEncoder
import com.goterl.lazysodium.utils.Key

object SecretBoxUtils {

  final case class SecretBoxEncryptionError(message: String, cause: Throwable)
  final case class SecretBoxDecryptionError(message: String, cause: Throwable)

  private val nonceSize = 24
  private lazy val sodium = new SodiumJava
  private lazy val lazySodiumForEncryption = new LazySodiumJava(sodium, new HexMessageEncoder)
  private lazy val lazySodiumForDecryption = new LazySodiumJava(sodium, new Base64MessageEncoder)

  def encrypt(secret: String, hexKey: String): Either[SecretBoxEncryptionError, String] =
    Either
      .catchNonFatal {
        val nonce = lazySodiumForEncryption.nonce(nonceSize)
        val encrypted = lazySodiumForEncryption.cryptoSecretBoxEasy(secret, nonce, Key.fromHexString(hexKey))
        val secretBytes = LazySodium.toBin(encrypted)
        Base64.getUrlEncoder.encodeToString(nonce ++ secretBytes)
      }
      .leftMap { e => SecretBoxEncryptionError("Couldn't encode secret", e) }

  def decrypt(base64Secret: String, hexKey: String): Either[SecretBoxDecryptionError, String] =
    Either
      .catchNonFatal {
        val secret = Base64.getUrlDecoder.decode(base64Secret.getBytes(StandardCharsets.UTF_8))
        val nonce = secret.take(nonceSize)
        val cipher = secret.drop(nonceSize)
        val base64Cipher = Base64.getEncoder.encodeToString(cipher)
        val decryptedSecret =
          lazySodiumForDecryption.cryptoSecretBoxOpenEasy(base64Cipher, nonce, Key.fromHexString(hexKey))
        decryptedSecret
      }
      .leftMap { e => SecretBoxDecryptionError(s"Incorrect secret box $base64Secret", e) }
}
