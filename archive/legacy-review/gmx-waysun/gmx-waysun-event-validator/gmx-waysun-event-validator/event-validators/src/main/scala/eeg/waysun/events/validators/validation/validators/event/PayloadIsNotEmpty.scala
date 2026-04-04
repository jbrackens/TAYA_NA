package eeg.waysun.events.validators.validation.validators.event

import stella.dataapi.eventconfigurations.EventConfiguration
import stella.dataapi.platformevents.EventEnvelope
import eeg.waysun.events.validators.validation.{ErrorCodes, EventValidation, ValidationResult}
import org.apache.commons.collections.CollectionUtils

class PayloadIsNotEmpty extends EventValidation {
  override def validate(eventDefinition: EventConfiguration, event: EventEnvelope): ValidationResult = {
    val payload = event.getPayload

    if (CollectionUtils.isNotEmpty(payload)) {
      ValidationResult.succeeded()
    } else
      ValidationResult.failure(ErrorCodes.EmptyPayload)
  }
}

object PayloadIsNotEmpty {

  def apply(): EventValidation = new PayloadIsNotEmpty

}
