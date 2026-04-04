package eeg.waysun.events.aggregation.data.generators.instances

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.data.generators.Generator
import eeg.waysun.events.aggregation.data.generators.instances.EventOcurrence.ExpectedEventOcurrence
import eeg.waysun.events.aggregation.data.generators.instances.instances._
import eeg.waysun.events.aggregation.streams.dto.{Field, EventOccurrence => EventOccurrenceInstance}

import java.time.Instant

object EventOcurrence {
  case class ExpectedEventOcurrence(fields: Seq[Field])
}
class EventOcurrence(expectedAggregationOcurrence: ExpectedEventOcurrence)(implicit
    projectId: ProjectId,
    userId: UserId,
    eventDefinitionId: EventDefinitionRuleId,
    eventName: EventName)
    extends Generator[Types.EventOccurrence.KeyedType] {

  import eeg.waysun.events.aggregation.Types.EventOccurrence._

  val keyType = new Generator[KeyType] {
    override def single(implicit index: Int): KeyType =
      new KeyType(
        projectId = projectId.value,
        userId = userId.value,
        eventDefinitionId = eventDefinitionId.value,
        eventName = eventName.value)
  }

  val valueType = new Generator[ValueType] {
    override def single(implicit index: Int): ValueType =
      EventOccurrenceInstance(
        eventDateTime = Instant.now().toEpochMilli,
        eventName = eventName.value,
        uuid = "uuid",
        fields = expectedAggregationOcurrence.fields)
  }

  override def single(implicit index: Int): Types.EventOccurrence.KeyedType =
    new Types.EventOccurrence.KeyedType(keyType.single, valueType.single)
}
