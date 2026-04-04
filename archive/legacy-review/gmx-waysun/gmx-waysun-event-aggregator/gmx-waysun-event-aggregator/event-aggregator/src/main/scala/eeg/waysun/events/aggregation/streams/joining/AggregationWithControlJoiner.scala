package eeg.waysun.events.aggregation.streams.joining

import eeg.waysun.events.aggregation.configs.AppConfigDef.AppConfig
import eeg.waysun.events.aggregation.splits.Descriptors
import eeg.waysun.events.aggregation.streams.dto.Streams
import eeg.waysun.events.aggregation.udf.AggregationProducerProcessFunction
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters

object AggregationWithControlJoiner {

  def aggregationControl(
      streams: Streams,
      aggregationOccurrence: Types.Stream.AggregationOccurrenceOutputDataStream,
      appConfig: AppConfig)(implicit
      executionParameters: JobExecutionParameters): Types.Stream.AggregationResultOutputDataStream = {

    val aggregationInstance = streams.aggregationControl.broadcast(Descriptors.aggregationControl)

    aggregationOccurrence
      .keyBy(_.key)(Implicits.AggregationOccurrenceImplicit.key)
      .connect(aggregationInstance)
      .process(new AggregationProducerProcessFunction(appConfig))(Implicits.AggregationResultImplicit.keyed)
  }
}
