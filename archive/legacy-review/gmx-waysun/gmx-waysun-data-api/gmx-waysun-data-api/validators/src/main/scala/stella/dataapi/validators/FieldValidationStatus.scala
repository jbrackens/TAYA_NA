package stella.dataapi.validators

sealed trait FieldValidationStatus

object FieldValidationStatus {
  case object Success extends FieldValidationStatus
  case class Failure(errorMessage: String) extends FieldValidationStatus
}
