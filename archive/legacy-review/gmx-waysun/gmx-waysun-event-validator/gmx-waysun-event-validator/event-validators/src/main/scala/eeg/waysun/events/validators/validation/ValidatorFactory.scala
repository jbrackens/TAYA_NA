package eeg.waysun.events.validators.validation

import eeg.waysun.events.validators.Types.RawWithDefinition
import eeg.waysun.events.validators.validation.validators.event._

object ValidatorFactory {

  def validate(event: RawWithDefinition.OutputType): ValidationResult = {
    if (event.value.broadcastEvent.isRemoved) {
      ValidationResult.failure(ErrorCodes.IncorrectValue)
    } else {
      validators()
        .map(_.validate(event.value.broadcastEvent.value.get, event.value.event.value))
        .foldLeft(ValidationResult.succeeded()) { (result, item) =>
          if (item.status)
            result
          else
            ValidationResult.failures(result.errorCodes ++ item.errorCodes)
        }
    }
  }

  private def validators(): Seq[EventValidation] =
    Seq(MessageIdIsNotEmpty(), PayloadIsNotEmpty(), HasDefinedRequiredFields(), ValueValidation())

}
