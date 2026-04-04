package eeg.waysun.events.aggregation.data.generators.instances

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.data.adapters.flink.Adapters
import eeg.waysun.events.aggregation.data.generators.Generator
import eeg.waysun.events.aggregation.data.generators.instances.instances._
import stella.dataapi.aggregation._

import java.time.Instant
import scala.collection.JavaConverters.seqAsJavaList

class AggregationDefinition(
    eventName: EventName,
    eventDefinitionId: EventDefinitionRuleId,
    projectId: ProjectId,
    aggregationRuleId: AggregationRuleId,
    scenario: Scenario)
    extends Generator[Types.AggregationDefinition.Source] {

  import eeg.waysun.events.aggregation.Types.AggregationDefinition._

  val keyType: Generator[KeyType] = (_: Int) => {
    val key = new AggregationRuleConfigurationKey()
    key.setName(eventName.value)
    key.setEventId(eventDefinitionId.value)
    key.setRuleId(aggregationRuleId.value)
    key.setProjectId(projectId.value)
    key
  }

  val valueType: Generator[ValueType] = (_: Int) =>
    AggregationRuleConfiguration
      .newBuilder()
      .setAggregationType(scenario.aggregationType)
      .setAggregationGroupByFieldName(scenario.aggregationGroupByFieldName)
      .setAggregationFieldName(scenario.aggregationFieldName)
      .setResetFrequency(
        AggregationInterval
          .newBuilder()
          .setIntervalType(IntervalType.MINUTES)
          .setWindowStartDateUTC(Instant.now().minusSeconds(10).toEpochMilli)
          .setIntervalDetails(IntervalDetails.newBuilder().setLength(1).setWindowCountLimit(10).build())
          .build())
      .setAggregationConditions(seqAsJavaList(scenario.conditions))
      .build()

  override def single(implicit index: Int): Source =
    Adapters.Flink.toTuple(keyType.single, valueType.single)
}
