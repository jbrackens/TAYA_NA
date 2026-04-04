package eeg.waysun.events.aggregation.data.generators.instances

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.data.generators.Generator
import eeg.waysun.events.aggregation.data.generators.instances.AggregationOccurrence.ExpectedAggregationOccurrence
import eeg.waysun.events.aggregation.data.generators.instances.instances._
import eeg.waysun.events.aggregation.streams.dto.{Field, Aggregation => AggregationOccurrenceInstance}
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import stella.dataapi.aggregation.{AggregationValues, IntervalType}

import java.time.{Duration, Instant}

object AggregationOccurrence {

  case class ExpectedAggregationOccurrence(field: Field, aggregationValues: AggregationValues)
}

class AggregationOccurrence(expectedAggregationOcurrence: ExpectedAggregationOccurrence)(implicit
    projectId: ProjectId,
    aggregationRuleId: AggregationRuleId,
    eventDefinitionId: EventDefinitionRuleId,
    eventName: EventName,
    userId: UserId,
    scenario: Scenario)
    extends Generator[Types.AggregationOccurrence.KeyedType] {

  import eeg.waysun.events.aggregation.Types.AggregationOccurrence._

  val keyType: Generator[KeyType] = (_: Int) => {
    new KeyType(
      projectId = projectId.value,
      userId = userId.value,
      eventDefinitionId = eventDefinitionId.value,
      eventName = eventName.value,
      aggregationDefinitionId = aggregationRuleId.value)
  }

  val valueType: Generator[ValueType] = (_: Int) =>
    AggregationOccurrenceInstance(
      eventDateTime = Instant.now().toEpochMilli,
      eventName = eventName.value,
      projectId = projectId.value,
      uuid = "uuid",
      aggregationDefinitionRuleId = aggregationRuleId.value,
      eventDefinitionRuleId = eventDefinitionId.value,
      aggregationFieldName = scenario.aggregationFieldName,
      aggregationFieldValue = expectedAggregationOcurrence.field.value,
      aggregationFieldType = expectedAggregationOcurrence.field.fieldType,
      aggregationGroupByFieldName = scenario.aggregationGroupByFieldName,
      aggregationGroupByFieldValue = expectedAggregationOcurrence.field.value,
      intervalType = IntervalType.MINUTES.toString,
      intervalLength = 1,
      windowStartDateTime = Instant.now().minus(Duration.ofSeconds(10)).toEpochMilli,
      windowCountLimit = Some(Int.MaxValue),
      count = expectedAggregationOcurrence.aggregationValues.count,
      min = expectedAggregationOcurrence.aggregationValues.min,
      max = expectedAggregationOcurrence.aggregationValues.max,
      sum = expectedAggregationOcurrence.aggregationValues.sum,
      custom = expectedAggregationOcurrence.aggregationValues.custom.toString)

  override def single(implicit index: Int): Types.AggregationOccurrence.KeyedType =
    KeyValue(key = keyType.single, value = valueType.single)
}
