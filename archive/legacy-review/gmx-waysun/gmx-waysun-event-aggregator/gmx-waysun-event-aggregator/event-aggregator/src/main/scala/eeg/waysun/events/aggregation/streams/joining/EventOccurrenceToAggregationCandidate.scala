package eeg.waysun.events.aggregation.streams.joining

import eeg.waysun.events.aggregation.splits.Descriptors
import eeg.waysun.events.aggregation.streams.dto.Streams
import eeg.waysun.events.aggregation.udf.AggregationCandidateIdentifier
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters

object EventOccurrenceToAggregationCandidate {

  def build(streams: Streams, eventOccurrence: Types.Stream.EventOccurrenceOutputDataStream)(implicit
      jep: JobExecutionParameters): Types.Stream.AggregationCandidateOutputDataStream = {
    val broadcastAggregationDefinitions = streams.aggregationsInProjects.broadcast(Descriptors.aggregationsInProjects)

    eventOccurrence
      .keyBy(_.key)(Implicits.EventOccurrenceImplicit.key)
      .connect(broadcastAggregationDefinitions)
      .process(new AggregationCandidateIdentifier())(Implicits.AggregationCandidateImplicit.keyed)
  }
}
