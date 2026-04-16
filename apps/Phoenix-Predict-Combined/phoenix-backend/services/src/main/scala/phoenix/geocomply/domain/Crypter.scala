package phoenix.geocomply.domain

import phoenix.geocomply.domain.Crypter.FailedToDecrypt
import phoenix.geocomply.domain.Crypter.FailedToEncrypt

trait Crypter {

  def decrypt(input: String): Either[FailedToDecrypt.type, String]
  def encrypt(input: String): Either[FailedToEncrypt.type, String]
}

object Crypter {

  final case object FailedToDecrypt
  final case object FailedToEncrypt
}
