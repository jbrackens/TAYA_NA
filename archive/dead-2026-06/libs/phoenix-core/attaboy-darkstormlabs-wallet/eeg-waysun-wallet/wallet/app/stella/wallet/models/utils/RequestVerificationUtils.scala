package stella.wallet.models.utils

object RequestVerificationUtils {

  def verifyNonBlankString(fieldName: String, value: String, maxLength: Int): Unit =
    require(
      value.trim.nonEmpty && value.length <= maxLength,
      s"'$fieldName' must be non-empty, non-blank and not longer than $maxLength characters, but it was '$value'")
}
