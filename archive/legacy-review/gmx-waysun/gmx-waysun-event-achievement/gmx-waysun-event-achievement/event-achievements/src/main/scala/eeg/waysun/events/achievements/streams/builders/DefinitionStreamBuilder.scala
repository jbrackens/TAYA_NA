package eeg.waysun.events.achievements.streams.builders

import eeg.waysun.events.achievements.mappers.AchievementDefinitionMapper
import eeg.waysun.events.achievements.watermarks.DefinitionEventCreationDateAssigner
import eeg.waysun.events.achievements.{Implicits, Types}
import net.flipsports.gmx.streaming.common.job.builders.SourceDataStreamBuilder
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

class DefinitionStreamBuilder extends Serializable {

  def build(
      env: StreamExecutionEnvironment,
      source: SourceFunction[Types.DefinitionType.Source]): Types.StreamType.AchievementDefinitionStream = {
    buildTopology {
      SourceDataStreamBuilder.withSource[Types.DefinitionType.Source](env, source, "definition-events")(
        Implicits.DefinitionImplicit.keyWithValue)
    }
  }

  @VisibleForTesting
  def buildTopology(
      dataStream: => DataStream[Types.DefinitionType.Source]): Types.StreamType.AchievementDefinitionStream = {
    dataStream
      .assignTimestampsAndWatermarks(DefinitionEventCreationDateAssigner())
      .name("eeg-streaming.events-definition")
      .map(AchievementDefinitionMapper.toWrapped)(Implicits.DefinitionImplicit.wrapped)
  }

}

object DefinitionStreamBuilder {

  def apply(): DefinitionStreamBuilder = new DefinitionStreamBuilder()

}
