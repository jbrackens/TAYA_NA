package stella.rules.models

object ConstructorRequirementsUtils {
  def requireNonEmptyAndNonBlankWithLengthLimit(fieldName: String, fieldValue: String, maxLength: Int): Unit =
    require(
      !fieldValue.isBlank && fieldValue.length <= maxLength,
      s"$fieldName must be non-empty, non-blank and not longer than $maxLength characters but '$fieldValue' has ${fieldValue.length} chars")
}
