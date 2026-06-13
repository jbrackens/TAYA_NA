package phoenix.utils.cryptography

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

final class EncryptionSpec extends AnyWordSpecLike with Matchers {
  "should be able to decrypt encrypted text" in {
    (1 to 10).foreach { n =>
      val password = EncryptionPassword(s"some_password_for_encryption_1234%%^^^/|$n")
      val text = UnencryptedText(s"Super secret text number $n")

      val encrypted = Encryption.encrypt(text, password)
      val unencrypted = Encryption.decrypt(encrypted, password)

      unencrypted shouldBe Right(text)
    }
  }

  "should decrypt encrypted text in expected format" in {
    val password = EncryptionPassword("secret_password")
    val encryptedText =
      EncryptedResult("94WFl6WhnmHwNK9vuGa5og3dgkm8YFymotc2NukttO001b9bIn0yqDuRDIvXEAN4eh4FW78P6kGr3KMlAy09")

    Encryption.decrypt(encryptedText, password) shouldBe Right(UnencryptedText("This text is secret"))
  }

  "should fail to decrypt text with a different password" in {
    val passwordForEncryption = EncryptionPassword("some_password_for_encryption_1234%%^^^$$$")
    val otherPassword = EncryptionPassword("other_password")
    val text = UnencryptedText("Super secret text")

    val encrypted = Encryption.encrypt(text, passwordForEncryption)

    val result = Encryption.decrypt(encrypted, otherPassword)
    result.isLeft shouldBe true
  }
}
