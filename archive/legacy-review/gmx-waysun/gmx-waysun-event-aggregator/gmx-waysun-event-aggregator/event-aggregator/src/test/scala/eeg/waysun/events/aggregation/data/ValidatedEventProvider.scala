package eeg.waysun.events.aggregation.data

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.Types.Validated.{FieldType, KeyType, ValueType}
import eeg.waysun.events.aggregation.data.EventConfigurationProvider.sampleFields
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import stella.dataapi.platformevents.Source

import java.util.UUID
import scala.collection.JavaConverters._

trait ValidatedEventProvider
    extends DataProvider.WithPayload[(Types.Validated.KeyType, Types.Validated.ValueType), Types.Validated.FieldType] {
  override def buildFake(
      item: Int,
      name: String,
      projectId: String,
      payloadData: Option[Seq[FieldType]]): (KeyType, ValueType) = {
    val key = new Types.Validated.KeyType()
    key.setUserId(ValidatedEventProvider.userId(item))
    key.setProjectId(projectId)
    val value = new Types.Validated.ValueType()
    value.setSource(Source.external)
    value.setEventDefinitionId(EventConfigurationProvider.eventId(item))
    value.setMessageId(UUID.randomUUID().toString)
    value.setEventName(name)
    val fields = payloadData match {
      case None         => generateFields.asJava
      case Some(Seq())  => null
      case Some(fields) => fields.asJava
    }
    value.setPayload(fields)
    value.setMessageOriginDateUTC(DateFormats.nowOffsetTimeAtUtc().toString)
    value.setMessageProcessingDateUTC(DateFormats.nowOffsetTimeAtUtc().toString)
    (key, value)
  }

  private def generateFields: Seq[Types.Validated.FieldType] = sampleFields.map { case (fieldName, fieldType) =>
    asField(fieldName, fieldType)
  }

  private def asField(fieldName: String, fieldType: String) = new Types.Validated.FieldType(fieldName, "1", fieldType)
}

object ValidatedEventProvider extends ValidatedEventProvider {

  def userId(item: Int): String = s"user-$item"
}
