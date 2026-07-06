package phoenix.geocomply.domain

object Decryption {
  final case class DecryptionKey(value: String)
  final case class DecryptionInitializationVector(value: String)

  final case class EncryptedGeoPacket(encryptedString: String)
}
