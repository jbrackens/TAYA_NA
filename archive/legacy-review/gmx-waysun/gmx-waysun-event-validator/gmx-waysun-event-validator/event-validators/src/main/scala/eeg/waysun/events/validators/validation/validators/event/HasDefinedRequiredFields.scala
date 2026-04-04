package eeg.waysun.events.validators.validation.validators.event

import stella.dataapi.eventconfigurations.EventConfiguration
import stella.dataapi.platformevents.EventEnvelope
import eeg.waysun.events.validators.validation.{ErrorCodes, EventValidation, ValidationResult}

import scala.collection.JavaConverters._

class HasDefinedRequiredFields extends EventValidation {

  override def validate(eventDefinitionFields: EventConfiguration, event: EventEnvelope): ValidationResult = {
    if (event.getPayload != null) {
      val requiredFields = eventDefinitionFields.getFields.asScala
      val eventFields = event.getPayload.asScala.map(item => (item.getName.toString, item)).toMap
      val missedFields = requiredFields.map(_.getName.toString).map(eventFields.contains).filter(!_)

      if (missedFields.isEmpty)
        ValidationResult.succeeded()
      else
        ValidationResult.failure(ErrorCodes.MissedFields)
    } else ValidationResult.succeeded()
  }
}

object HasDefinedRequiredFields {

  def apply(): EventValidation = new HasDefinedRequiredFields
}
