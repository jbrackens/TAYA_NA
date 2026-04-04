package eeg.waysun.events.aggregation.data.generators.instances

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.data.adapters.flink.Adapters
import eeg.waysun.events.aggregation.data.generators.Generator
import eeg.waysun.events.aggregation.data.generators.instances.instances._
import stella.dataapi.platformevents.FieldTyped

import java.time.format.DateTimeFormatter
import java.time.{OffsetDateTime, ZoneOffset}
import java.util
import scala.collection.JavaConverters.seqAsJavaList

class Validated(
    userId: UserId,
    eventDefinitionId: EventDefinitionRuleId,
    eventName: EventName,
    projectId: ProjectId,
    messageId: MessageId,
    scenario: Scenario)
    extends Generator[Types.Validated.Source] {
  import eeg.waysun.events.aggregation.Types.Validated._

  val keyType: Generator[KeyType] = (_: Int) => {
    val key = new KeyType()
    key.setProjectId(projectId.value)
    key.setUserId(userId.value)
    key
  }

  import EventEnvelopeData._

  val valueType: Generator[ValueType] = (_: Int) => {
    val value = new ValueType()
    value.setSource(source)
    value.setMessageId(messageId.value)
    value.setEventName(eventName.value)
    value.setPayload(payload)
    value.setMessageOriginDateUTC(messageOriginDateUTC)
    value.setMessageProcessingDateUTC(messageProcessingDateUTC)
    value.setEventDefinitionId(eventDefinitionId.value)
    value
  }

  override def single(implicit index: Int): Source =
    Adapters.Flink.toTuple(keyType.single, valueType.single)

  object EventEnvelopeData {
    import stella.dataapi.platformevents.Source

    def ISOFormat: OffsetDateTime => String =
      // example: ISOFormat(OffsetDateTime.now().minusSeconds(5)) => 2022-03-04T11:04:34+00:00
      _.withOffsetSameInstant(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ssxxx"))

    val messageOriginDateUTC: String = ISOFormat(OffsetDateTime.now().minusSeconds(5))
    val messageProcessingDateUTC: String = ISOFormat(OffsetDateTime.now().minusSeconds(4))
    val source: Source = Source.external

    def payload: util.List[FieldTyped] =
      seqAsJavaList(scenario.fields.map { case (fieldName, (fieldType, fieldValue)) =>
        FieldTyped.newBuilder().setName(fieldName.name).setValue(fieldValue.value).setType(fieldType.fType).build()
      }.toSeq)
  }
}
