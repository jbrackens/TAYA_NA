package eeg.waysun.events.aggregation.data.generators.instances

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.data.adapters.flink.Adapters
import eeg.waysun.events.aggregation.data.generators.Generator
import eeg.waysun.events.aggregation.data.generators.instances.instances._
import eeg.waysun.events.aggregation.streams.dto.{AggregationControlId, AggregationControl => AggregationControlDto}

class AggregationControl(projectId: ProjectId, aggregationRuleId: AggregationRuleId)
    extends Generator[Types.AggregationControl.Source] {

  import eeg.waysun.events.aggregation.Types.AggregationControl._
  val keyType = new Generator[KeyType] {
    override def single(implicit index: Int): KeyType =
      AggregationControlId(projectId.value, aggregationRuleId.value)
  }
  val valueType = new Generator[ValueType] {
    override def single(implicit index: Int): ValueType =
      AggregationControlDto(command = "command", action = "action", "value")
  }

  override def single(implicit index: Int): Source =
    Adapters.Flink.toTuple(keyType.single, valueType.single)
}
