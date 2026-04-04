package eeg.waysun.events.aggregation.streams.joining

import eeg.waysun.events.aggregation.splits.Descriptors
import eeg.waysun.events.aggregation.streams.dto.Streams
import eeg.waysun.events.aggregation.udf.AggregationDefinitionIdProcessFunction
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters

object AggregationCandidateToOccurrence {

  def build(streams: Streams, aggregationCandidate: Types.Stream.AggregationCandidateOutputDataStream)(implicit
      jep: JobExecutionParameters): Types.Stream.AggregationOccurrenceOutputDataStream = {
    val broadcastAggregationDefinitions = streams.aggregationDefinition.broadcast(Descriptors.aggregationDefinitions)

    aggregationCandidate
      .keyBy(_.key)(Implicits.AggregationCandidateImplicit.key)
      .connect(broadcastAggregationDefinitions)
      .process(new AggregationDefinitionIdProcessFunction())(Implicits.AggregationOccurrenceImplicit.keyed)
  }
}
