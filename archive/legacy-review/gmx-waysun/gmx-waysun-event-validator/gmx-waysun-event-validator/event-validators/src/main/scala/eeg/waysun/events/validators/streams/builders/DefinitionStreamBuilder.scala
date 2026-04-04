package eeg.waysun.events.validators.streams.builders

import eeg.waysun.events.validators.Types.Definition.Source
import eeg.waysun.events.validators.watermarks.DefinitionEventCreationDateAssigner
import eeg.waysun.events.validators.{Implicits, Types}
import net.flipsports.gmx.streaming.common.job.builders.SourceDataStreamBuilder
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

class DefinitionStreamBuilder extends Serializable {

  def build(
      env: StreamExecutionEnvironment,
      source: SourceFunction[Types.Definition.Source]): Types.Stream.DefinitionDataStream = {
    buildTopology {
      SourceDataStreamBuilder.withSource[Types.Definition.Source](env, source, "definition-events")(
        Implicits.DefinitionImplicit.keyWithValue)
    }
  }

  def asKey(item: Source): Types.Definition.KeyType = {
    val projectId = item.f0.projectId.toString
    val eventDefinitionRuleId = item.f0.getEventId.toString
    val eventName = Some(item.f0.getName.toString)
    new Types.Definition.KeyType(projectId, eventDefinitionRuleId, eventName)
  }

  @VisibleForTesting
  def buildTopology(dataStream: => DataStream[Types.Definition.Source]): Types.Stream.DefinitionDataStream = {
    dataStream
      .assignTimestampsAndWatermarks(DefinitionEventCreationDateAssigner())
      .name("eeg-streaming.events-definition")
      .map(item => new KeyValue(asKey(item), item.f1))(Implicits.DefinitionImplicit.keyed)
  }

}
