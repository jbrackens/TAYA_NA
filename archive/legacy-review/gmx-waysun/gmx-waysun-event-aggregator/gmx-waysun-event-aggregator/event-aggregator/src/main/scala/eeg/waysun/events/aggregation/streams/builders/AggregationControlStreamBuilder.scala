package eeg.waysun.events.aggregation.streams.builders

import eeg.waysun.events.aggregation.streams.StepNames
import eeg.waysun.events.aggregation.watermarks.AggregationControlDateAssigner
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.job.builders.SourceDataStreamBuilder
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

object AggregationControlStreamBuilder extends Serializable {

  def build(
      env: StreamExecutionEnvironment,
      source: SourceFunction[Types.AggregationControl.Source]): Types.Stream.AggregationControlKeyedDataStream = {
    buildTopology {
      SourceDataStreamBuilder.withSource[Types.AggregationControl.Source](
        env,
        source,
        StepNames.aggregationControlSource)(Implicits.AggregationControlImplicit.source)
    }
  }

  @VisibleForTesting
  def buildTopology(
      dataStream: => DataStream[Types.AggregationControl.Source]): Types.Stream.AggregationControlKeyedDataStream = {
    dataStream
      .assignTimestampsAndWatermarks(AggregationControlDateAssigner())
      .name(StepNames.streamAggregationControlSource)
      .map(asKeyed)(Implicits.AggregationControlImplicit.keyed)
  }

  def asKeyed: Types.AggregationControl.Source => Types.AggregationControl.KeyedType =
    source => new Types.AggregationControl.KeyedType(source.f0, source.f1)

}
