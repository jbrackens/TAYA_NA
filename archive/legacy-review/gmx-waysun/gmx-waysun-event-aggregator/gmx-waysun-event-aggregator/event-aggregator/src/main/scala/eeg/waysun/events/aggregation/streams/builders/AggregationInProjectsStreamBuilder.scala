package eeg.waysun.events.aggregation.streams.builders

import eeg.waysun.events.aggregation.udf.AggregationsInProjectProcessFunction
import eeg.waysun.events.aggregation.{Implicits, Types}

object AggregationInProjectsStreamBuilder {

  def build(aggregationDefinitionStream: Types.Stream.AggregationDefinitionKeyedDataStream)
      : Types.Stream.AggregationInProjectsKeyedDataStream = {
    aggregationDefinitionStream.map(new AggregationsInProjectProcessFunction())(
      Implicits.AggregationsInProjectImplicit.keyed)
  }
}
