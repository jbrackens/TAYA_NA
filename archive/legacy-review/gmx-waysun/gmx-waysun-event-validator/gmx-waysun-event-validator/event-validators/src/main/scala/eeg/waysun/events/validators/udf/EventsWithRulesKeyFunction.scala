package eeg.waysun.events.validators.udf

import eeg.waysun.events.validators.Types
import eeg.waysun.events.validators.Types.{Definition, Joining, Raw, RawWithDefinitionKey}
import eeg.waysun.events.validators.splits.Descriptors
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.job.streams.BroadcastEventCache
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import net.flipsports.gmx.streaming.common.logging.{JoinedStreamingLogLevels, log}
import org.apache.flink.api.common.state.{BroadcastState, MapStateDescriptor}
import org.apache.flink.streaming.api.functions.co.KeyedBroadcastProcessFunction
import org.apache.flink.util.Collector

class EventsWithRulesKeyFunction(implicit val executionParameters: JobExecutionParameters)
    extends KeyedBroadcastProcessFunction[
      Joining.KeyType,
      Raw.KeyedType,
      Definition.KeyedType,
      RawWithDefinitionKey.KeyedType]
    with BroadcastEventCache[Definition.KeyType, Definition.KeyedType]
    with JoinedStreamingLogLevels {
  import EventsWithRulesKeyFunction._

  def processingEventCacheDescriptor: MapStateDescriptor[Definition.KeyType, Definition.KeyedType] =
    Descriptors.definitions

  override def processElement(value: Raw.KeyedType, ctx: ReadContext, out: Output): Unit = {
    log(logger, s"Processing element with key: ${ctx.getCurrentKey}", processElementLogLevel)
    val currentKey = ctx.getCurrentKey
    val definitions = ctx.getBroadcastState(processingEventCacheDescriptor)
    val projectId = value.key.projectId
    forEachBroadcastEvent(definitions) { definition =>
      val definitionKey = definition.getKey
      if (projectId.equalsIgnoreCase(definitionKey.projectId) &&
        definitionKey.eventName.getOrElse("").equalsIgnoreCase(value.key.eventName)) {
        log(logger, s"Publishing event on raw event connected with definition ${currentKey}", processElementLogLevel)
        val key = new RawWithDefinitionKey.KeyType(currentKey.f0, currentKey.f1)
        val result = new RawWithDefinitionKey.ValueType(value.key, value.value, definition.getKey)
        out.collect(KeyValue(key, result))
      }
    }
    log(logger, s"Done processing element with key: ${ctx.getCurrentKey}", processElementLogLevel)
  }

  override def processBroadcastElement(state: Definition.KeyedType, ctx: WriteContext, out: Output): Unit = {
    log(logger, s"Processing broadcast element. State: $state", processBroadcastElementLogLevel)
    val definition = ctx.getBroadcastState(processingEventCacheDescriptor)
    if (state.isValueNull()) {
      removeBroadcastEvent(state.key, definition)
    } else {
      collectBroadcastEvent(state.key, state, definition)
    }
    log(logger, s"Done processing broadcast element on state: $state", processBroadcastElementLogLevel)
  }

}

object EventsWithRulesKeyFunction {

  type ReadContext = KeyedBroadcastProcessFunction[
    Joining.KeyType,
    Raw.KeyedType,
    Definition.KeyedType,
    RawWithDefinitionKey.KeyedType]#ReadOnlyContext

  type WriteContext = KeyedBroadcastProcessFunction[
    Joining.KeyType,
    Raw.KeyedType,
    Definition.KeyedType,
    RawWithDefinitionKey.KeyedType]#Context

  type Output = Collector[RawWithDefinitionKey.KeyedType]

  type BroadCastedState = BroadcastState[Types.Definition.KeyType, Types.Definition.KeyedType]
}
