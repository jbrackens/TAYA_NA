package eeg.waysun.events.validators.streams.builders

import eeg.waysun.events.validators.watermarks.RawEventCreationDateAssigner
import eeg.waysun.events.validators.{Implicits, Types}
import net.flipsports.gmx.streaming.common.conversion.StringOps._
import net.flipsports.gmx.streaming.common.job.builders.SourceDataStreamBuilder
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

class RawEventsStreamBuilder extends Serializable {

  def build(env: StreamExecutionEnvironment, source: SourceFunction[Types.Raw.Source]): Types.Stream.RawDataStream = {
    buildTopology {
      SourceDataStreamBuilder
        .withSource[Types.Raw.Source](env, source, "raw-events")(Implicits.RawImplicit.keyWithValue)
    }
  }

  @VisibleForTesting
  def buildTopology(dataStream: => DataStream[Types.Raw.Source]): Types.Stream.RawDataStream = {
    dataStream
      .assignTimestampsAndWatermarks(RawEventCreationDateAssigner())
      .name("eeg-streaming.events-raw")
      .map(item => KeyValue(extractKey(item), item.f1))(Implicits.RawImplicit.keyed)
      .name("eeg-streaming.events-raw-wrapped")
      .keyBy(buildKey(_))(Implicits.JoiningImplicit.key)
  }

  def buildKey(source: Types.Raw.KeyedType): Types.Joining.KeyType = {
    new Types.Joining.KeyType(source.key.projectId, source.key.userId)
  }

  def extractKey(source: Types.Raw.Source): Types.Raw.KeyType = {
    val key = source.f0
    val event = source.f1
    new Types.Raw.KeyType(key.getProjectId, key.getUserId, event.getEventName)
  }

}
