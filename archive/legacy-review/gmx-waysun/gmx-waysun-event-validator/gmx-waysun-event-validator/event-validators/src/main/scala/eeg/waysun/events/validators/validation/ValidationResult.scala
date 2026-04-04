package eeg.waysun.events.validators.validation

case class ValidationResult(status: Boolean, errorCodes: Seq[ErrorCodes])

object ValidationResult {

  def succeeded(): ValidationResult = ValidationResult(true, Seq())

  def failure(errorCode: ErrorCodes): ValidationResult = failures(Seq(errorCode))

  def failures(errorCodes: Seq[ErrorCodes]): ValidationResult = ValidationResult(false, errorCodes)

}
