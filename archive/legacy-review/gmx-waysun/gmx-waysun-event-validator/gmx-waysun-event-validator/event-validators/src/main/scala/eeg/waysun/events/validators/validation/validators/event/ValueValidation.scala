package eeg.waysun.events.validators.validation.validators.event

import stella.dataapi.eventconfigurations.EventConfiguration
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.validators.FieldType
import eeg.waysun.events.validators.validation.{ErrorCodes, EventValidation, ValidationResult}

import scala.collection.JavaConverters._

class ValueValidation extends EventValidation {

  override def validate(eventDefinition: EventConfiguration, event: EventEnvelope): ValidationResult = {

    if (event.getPayload != null) {
      val definitionFields = eventDefinition.getFields.asScala
      val eventFields = event.getPayload.asScala.map(event => (event.getName.toString, event)).toMap

      val wrongValueType = definitionFields
        .map { definition =>
          {
            val requiredName = definition.getName.toString
            val requiredValueType = definition.getValueType.toString

            eventFields.get(requiredName) match {
              case Some(field) => isFieldValueValid(String.valueOf(field.getValue), requiredValueType)
              case None        => true // in case of missing we don't care about it this validator
            }
          }
        }
        .filter(!_)

      if (wrongValueType.isEmpty)
        ValidationResult.succeeded()
      else
        ValidationResult.failure(ErrorCodes.IncorrectValue)
    } else ValidationResult.succeeded()
  }

  def isFieldValueValid(fieldValue: String, requiredValueType: String): Boolean = {
    val fieldType = FieldType.values.find(_.name.equalsIgnoreCase(requiredValueType))

    fieldType match {
      case None            => false
      case Some(fieldType) => fieldType.validate(fieldValue).isRight
    }
  }
}

object ValueValidation {

  def apply(): EventValidation = new ValueValidation

}
