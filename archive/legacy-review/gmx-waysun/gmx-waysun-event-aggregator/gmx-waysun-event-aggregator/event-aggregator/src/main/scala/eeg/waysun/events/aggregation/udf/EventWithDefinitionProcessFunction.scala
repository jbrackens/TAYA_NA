package eeg.waysun.events.aggregation.udf

import eeg.waysun.events.aggregation.Types.{EventOccurrence, Validated}
import eeg.waysun.events.aggregation.streams.dto.Field
import net.flipsports.gmx.streaming.common.conversion.StringOps._
import org.apache.flink.api.common.functions.MapFunction

import java.time.OffsetDateTime
import scala.collection.JavaConverters._

class EventWithDefinitionProcessFunction extends MapFunction[Validated.KeyedType, EventOccurrence.KeyedType] {

  def asField(field: Validated.FieldType): Field =
    Field(name = field.getName, fieldType = field.getType, value = field.getValue)

  override def map(source: Validated.KeyedType): EventOccurrence.KeyedType = {
    val key = new EventOccurrence.KeyType(
      projectId = source.key.getProjectId,
      userId = source.key.getUserId,
      eventDefinitionId = source.value.getEventDefinitionId,
      eventName = source.value.getEventName)

    val occurrence = source.value
    val convertedFields = occurrence.getPayload.asScala.map(asField)

    val value = new EventOccurrence.ValueType(
      eventDateTime = OffsetDateTime.parse(occurrence.getMessageOriginDateUTC).toInstant.toEpochMilli,
      eventName = occurrence.getEventName,
      uuid = occurrence.getMessageId,
      fields = convertedFields)

    new EventOccurrence.KeyedType(key, value)
  }
}
