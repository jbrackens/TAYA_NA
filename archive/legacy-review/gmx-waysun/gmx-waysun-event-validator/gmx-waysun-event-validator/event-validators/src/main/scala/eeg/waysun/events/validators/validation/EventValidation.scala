package eeg.waysun.events.validators.validation

import stella.dataapi.eventconfigurations.EventConfiguration
import stella.dataapi.platformevents.EventEnvelope

trait EventValidation {

  def validate(eventDefinition: EventConfiguration, event: EventEnvelope): ValidationResult

}
