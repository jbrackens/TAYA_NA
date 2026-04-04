package eeg.waysun.events.aggregation.splits

import eeg.waysun.events.aggregation.{Implicits, Types}
import org.apache.flink.api.common.state.MapStateDescriptor

object Descriptors {

  val aggregationDefinitions
      : MapStateDescriptor[Types.AggregationDefinition.KeyType, Types.AggregationDefinition.KeyedType] =
    new MapStateDescriptor(
      "eeg-streaming.aggregation-definitions",
      Implicits.AggregationDefinitionImplicit.key,
      Implicits.AggregationDefinitionImplicit.keyed)

  val aggregationsInProjects
      : MapStateDescriptor[Types.AggregationsInProjects.KeyType, Types.AggregationsInProjects.ValuesType] =
    new MapStateDescriptor(
      "eeg-streaming.aggregations-in-projects",
      Implicits.AggregationsInProjectImplicit.key,
      Implicits.AggregationsInProjectImplicit.values)

  val aggregationControl: MapStateDescriptor[Types.AggregationControl.KeyType, Types.AggregationControl.ValueType] =
    new MapStateDescriptor(
      "eeg-streaming.aggregation-control",
      Implicits.AggregationControlImplicit.key,
      Implicits.AggregationControlImplicit.value)

  val aggregationState: MapStateDescriptor[Types.AggregationResult.WindowKeyType, Types.AggregationResult.KeyedType] =
    new MapStateDescriptor(
      "eeg-streaming.aggregation-state",
      Implicits.AggregationInstanceImplicit.windowKey,
      Implicits.AggregationInstanceImplicit.keyed)
}
