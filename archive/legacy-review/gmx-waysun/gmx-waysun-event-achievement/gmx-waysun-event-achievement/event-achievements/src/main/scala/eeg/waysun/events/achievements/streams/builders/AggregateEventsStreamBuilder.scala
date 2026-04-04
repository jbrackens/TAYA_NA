package eeg.waysun.events.achievements.streams.builders

import eeg.waysun.events.achievements.mappers.AggregationMapper
import eeg.waysun.events.achievements.watermarks.AggregatedEventCreationDateAssigner
import eeg.waysun.events.achievements.{Implicits, Types}
import net.flipsports.gmx.streaming.common.job.builders.SourceDataStreamBuilder
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

class AggregateEventsStreamBuilder extends Serializable {

  def build(
      env: StreamExecutionEnvironment,
      source: SourceFunction[Types.AggregatedType.Source]): Types.StreamType.AggregateStream = {
    buildTopology {
      SourceDataStreamBuilder.withSource[Types.AggregatedType.Source](env, source, "aggregated-events")(
        Implicits.AggregatedImplicit.keyWithValue)
    }
  }

  @VisibleForTesting
  def buildTopology(dataStream: => DataStream[Types.AggregatedType.Source]): Types.StreamType.AggregateStream = {
    dataStream
      .assignTimestampsAndWatermarks(AggregatedEventCreationDateAssigner())
      .name("eeg-streaming.events-aggregated")
      .map(AggregationMapper.toWrapped)(Implicits.AggregatedImplicit.wrapped)
  }
}

object AggregateEventsStreamBuilder {

  def apply(): AggregateEventsStreamBuilder = new AggregateEventsStreamBuilder()

}
