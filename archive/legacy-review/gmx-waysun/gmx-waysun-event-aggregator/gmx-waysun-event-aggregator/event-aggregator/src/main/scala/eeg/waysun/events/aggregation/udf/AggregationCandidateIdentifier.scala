package eeg.waysun.events.aggregation.udf

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.Types.{AggregationCandidate, AggregationsInProjects, EventOccurrence}
import eeg.waysun.events.aggregation.splits.Descriptors
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.job.streams.BroadcastEventCache
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import org.apache.flink.api.common.state.{BroadcastState, MapStateDescriptor}
import org.apache.flink.streaming.api.functions.co.KeyedBroadcastProcessFunction
import org.apache.flink.util.Collector

class AggregationCandidateIdentifier(implicit val executionParameters: JobExecutionParameters)
    extends KeyedBroadcastProcessFunction[
      EventOccurrence.KeyType,
      EventOccurrence.KeyedType,
      AggregationsInProjects.KeyedType,
      AggregationCandidate.KeyedType]
    with BroadcastEventCache[AggregationsInProjects.KeyType, AggregationsInProjects.ValuesType] {
  import AggregationCandidateIdentifier._

  override def processingEventCacheDescriptor: BroadCastedDescriptor = Descriptors.aggregationsInProjects

  override def processElement(value: EventOccurrence.KeyedType, ctx: ReadContext, out: Output): Unit = {
    // TODO: we can create more complex type based not only project id but also on eventId from aggregation def.
    // if performance will be poor
    val state = ctx.getBroadcastState(processingEventCacheDescriptor)
    val projectId = value.key.projectId
    if (state.contains(projectId))
      state.get(value.key.projectId).foreach { aggregationDefinitionId =>
        val eventKey = value.key
        val key = new Types.AggregationCandidate.KeyType(
          projectId = eventKey.projectId,
          userId = eventKey.userId,
          eventDefinitionId = eventKey.eventDefinitionId,
          eventName = eventKey.eventName,
          aggregationDefinitionId = aggregationDefinitionId)
        out.collect(new KeyValue(key, value.value))
      }
  }

  override def processBroadcastElement(
      value: AggregationsInProjects.KeyedType,
      ctx: WriteContext,
      out: Output): Unit = {
    val state = ctx.getBroadcastState(processingEventCacheDescriptor)
    val projectUuid: String = value.key
    val hasCachedAggregationsInProjects = state.contains(projectUuid)
    if (value.isValueNull()) {
      if (hasCachedAggregationsInProjects) {
        val aggregationDefinitionIds = state.get(projectUuid)
        val projectAggregations: Set[String] = aggregationDefinitionIds - value.value
        collectBroadcastEvent(projectUuid, projectAggregations, state)
      }
    } else {
      val aggregationDefinitionIds: Set[String] = if (hasCachedAggregationsInProjects) {
        state.get(projectUuid)
      } else {
        Set()
      }
      val projectAggregations: Set[String] = aggregationDefinitionIds + value.value
      collectBroadcastEvent(projectUuid, projectAggregations, state)
    }
  }
}

object AggregationCandidateIdentifier {

  type ReadContext = KeyedBroadcastProcessFunction[
    EventOccurrence.KeyType,
    EventOccurrence.KeyedType,
    AggregationsInProjects.KeyedType,
    AggregationCandidate.KeyedType]#ReadOnlyContext

  type WriteContext = KeyedBroadcastProcessFunction[
    EventOccurrence.KeyType,
    EventOccurrence.KeyedType,
    AggregationsInProjects.KeyedType,
    AggregationCandidate.KeyedType]#Context

  type Output = Collector[AggregationCandidate.KeyedType]

  type BroadCastedState = BroadcastState[AggregationsInProjects.KeyType, AggregationsInProjects.ValuesType]

  type BroadCastedDescriptor = MapStateDescriptor[AggregationsInProjects.KeyType, AggregationsInProjects.ValuesType]
}
