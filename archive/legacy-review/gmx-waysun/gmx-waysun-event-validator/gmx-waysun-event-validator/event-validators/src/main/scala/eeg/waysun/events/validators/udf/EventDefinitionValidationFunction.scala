package eeg.waysun.events.validators.udf

import eeg.waysun.events.validators.Types
import eeg.waysun.events.validators.Types.{Definition, Raw, RawWithDefinition, RawWithDefinitionKey}
import eeg.waysun.events.validators.splits.Descriptors
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.job.streams.BroadcastEventCache
import net.flipsports.gmx.streaming.common.job.streams.dto.{KeyValue, KeyValueOpt}
import net.flipsports.gmx.streaming.common.logging.{JoinedStreamingLogLevels, log}
import org.apache.flink.api.common.state.{MapStateDescriptor, ReadOnlyBroadcastState}
import org.apache.flink.streaming.api.functions.co.KeyedBroadcastProcessFunction
import org.apache.flink.util.Collector

class EventDefinitionValidationFunction(implicit val executionParameters: JobExecutionParameters)
    extends KeyedBroadcastProcessFunction[
      RawWithDefinitionKey.KeyType,
      RawWithDefinitionKey.KeyedType,
      Definition.KeyedType,
      RawWithDefinition.OutputType]
    with BroadcastEventCache[Definition.KeyType, Definition.KeyedType]
    with JoinedStreamingLogLevels {

  override def processingEventCacheDescriptor: MapStateDescriptor[Definition.KeyType, Definition.KeyedType] =
    Descriptors.definitions

  def companiesMatch(source: Raw.KeyType, definitionKey: Definition.KeyType): Boolean =
    definitionKey.projectId.equalsIgnoreCase(source.projectId)

  def eventNameMatch(event: Types.Raw.KeyType, definition: Definition.KeyType): Boolean =
    definition.eventName.getOrElse("").equalsIgnoreCase(event.eventName)

  def shouldAcceptDefinition(event: RawWithDefinitionKey.KeyedType, definition: Definition.KeyType): Boolean = {
    log(logger, s"Checking key with definition ${event.key} - ${definition}", processElementLogLevel)
    companiesMatch(event.value.f0, definition) && eventNameMatch(event.value.f0, definition)
  }

  override def processElement(
      event: RawWithDefinitionKey.KeyedType,
      ctx: KeyedBroadcastProcessFunction[
        RawWithDefinitionKey.KeyType,
        RawWithDefinitionKey.KeyedType,
        Definition.KeyedType,
        RawWithDefinition.OutputType]#ReadOnlyContext,
      out: Collector[RawWithDefinition.OutputType]): Unit = {
    log(logger, s"Processing main stream element. Key: ${ctx.getCurrentKey} value: $event", processElementLogLevel)
    val elements: ReadOnlyBroadcastState[Definition.KeyType, Definition.KeyedType] =
      ctx.getBroadcastState(processingEventCacheDescriptor)
    val currentKey = ctx.getCurrentKey
    val definitionKey = event.value.f2
    val definitionValue = elements.get(definitionKey)
    val definitionAccepted = shouldAcceptDefinition(event, definitionKey)
    if (definitionAccepted) {
      val value = new RawWithDefinition.ValueType(
        KeyValue(event.value.f0, event.value.f1),
        KeyValueOpt(definitionKey, definitionValue.value))
      out.collect(KeyValue(currentKey, value))
    }
    log(logger, s"Done procesing main element on key ${ctx.getCurrentKey}", processElementLogLevel)
  }

  override def processBroadcastElement(
      state: Definition.KeyedType,
      ctx: KeyedBroadcastProcessFunction[
        RawWithDefinitionKey.KeyType,
        RawWithDefinitionKey.KeyedType,
        Definition.KeyedType,
        RawWithDefinition.OutputType]#Context,
      out: Collector[RawWithDefinition.OutputType]): Unit = {
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
