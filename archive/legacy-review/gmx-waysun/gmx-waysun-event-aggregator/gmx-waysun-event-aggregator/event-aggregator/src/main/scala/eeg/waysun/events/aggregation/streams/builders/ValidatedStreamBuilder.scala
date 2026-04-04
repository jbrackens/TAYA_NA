package eeg.waysun.events.aggregation.streams.builders

import eeg.waysun.events.aggregation.streams.StepNames
import eeg.waysun.events.aggregation.watermarks.RawEventCreationDateAssigner
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.job.builders.SourceDataStreamBuilder
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

object ValidatedStreamBuilder extends Serializable {

  def build(
      env: StreamExecutionEnvironment,
      source: SourceFunction[Types.Validated.Source]): Types.Stream.ValidatedEventsKeyedDataStream = {
    buildTopology {
      SourceDataStreamBuilder
        .withSource[Types.Validated.Source](env, source, StepNames.validatedSource)(Implicits.ValidatedImplicit.source)
    }
  }

  @VisibleForTesting
  def buildTopology(dataStream: => DataStream[Types.Validated.Source]): Types.Stream.ValidatedEventsKeyedDataStream = {
    dataStream
      .assignTimestampsAndWatermarks(RawEventCreationDateAssigner())
      .name(StepNames.streamValidatedSource)
      .map(KeyValue.fromTuple2(_))(Implicits.ValidatedImplicit.keyed)
  }
}
