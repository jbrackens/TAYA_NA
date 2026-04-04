package eeg.waysun.events.validators.mappers

import eeg.waysun.events.validators.Types
import eeg.waysun.events.validators.Types.RawWithDefinition.OutputType
import stella.dataapi.platformevents.FieldTyped

import java.util
import scala.collection.JavaConverters._

object ValidatedEventMapper extends Serializable {

  def fieldsWithTypes(source: OutputType): util.List[FieldTyped] = {
    val typesMapping = source.value.broadcastEvent.value.get.fields.asScala.map { field =>
      field.name.toString -> field.valueType.toString
    }.toMap

    source.value.event.value.getPayload.asScala
      .map { field =>
        val fieldTyped = new FieldTyped()
        fieldTyped.setName(field.name)
        fieldTyped.setValue(field.value)
        fieldTyped.setType(typesMapping.getOrElse(field.name.toString, ""))
        fieldTyped
      }
      .toList
      .asJava
  }

  def map(source: Types.RawWithDefinition.OutputType): Types.Validated.Source = {
    val event = source.value.event

    val key = new Types.Validated.KeyType()
    key.setUserId(event.key.userId)
    key.setProjectId(event.key.projectId)
    val value = new Types.Validated.ValueType()
    value.setEventName(event.key.eventName)
    value.setEventDefinitionId(source.value.broadcastEvent.key.eventDefinitionRuleId)
    value.setSource(event.value.getSource)
    value.setPayload(fieldsWithTypes(source))
    value.setMessageId(event.value.getMessageId)
    value.setMessageOriginDateUTC(event.value.getMessageOriginDateUTC)
    value.setMessageProcessingDateUTC(event.value.getMessageProcessingDateUTC)
    new Types.Validated.Source(key, value)
  }
}
