package eeg.waysun.events.aggregation.udf

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.Types.{AggregationControl, AggregationOccurrence, AggregationResult}
import eeg.waysun.events.aggregation.configs.AppConfigDef.AppConfig
import eeg.waysun.events.aggregation.functions.WindowRangeCalculator
import eeg.waysun.events.aggregation.splits.Descriptors
import eeg.waysun.events.aggregation.streams.dto.{Interval, Window}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import net.flipsports.gmx.streaming.common.job.streams.BroadcastEventCache
import net.flipsports.gmx.streaming.common.logging.JoinedStreamingLogLevels
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.api.common.state.{BroadcastState, MapState, MapStateDescriptor}
import org.apache.flink.configuration.Configuration
import org.apache.flink.streaming.api.functions.co.KeyedBroadcastProcessFunction
import org.apache.flink.util.Collector
import stella.dataapi.aggregation.{AggregationValues, IntervalType}

import scala.collection.JavaConverters._

class AggregationProducerProcessFunction(val appConfig: AppConfig)(implicit
    val executionParameters: JobExecutionParameters)
    extends KeyedBroadcastProcessFunction[
      AggregationOccurrence.KeyType,
      AggregationOccurrence.KeyedType,
      AggregationControl.KeyedType,
      AggregationResult.KeyedType]
    with BroadcastEventCache[AggregationControl.KeyType, AggregationControl.ValueType]
    with JoinedStreamingLogLevels {
  import AggregationProducerProcessFunction._

  override def processingEventCacheDescriptor: BroadCastedDescriptor = Descriptors.aggregationControl

  @transient
  protected var aggregationState: MapState[Window, AggregationResult.KeyedType] = _

  override def open(parameters: Configuration): Unit = {
    super.open(parameters)
    aggregationState = getRuntimeContext.getMapState(Descriptors.aggregationState)
  }

  override def processBroadcastElement(value: AggregationControl.KeyedType, ctx: WriteContext, out: Output): Unit = {
    val state = ctx.getBroadcastState(processingEventCacheDescriptor)
    if (value.isValueNull()) {
      removeBroadcastEvent(value.key, state)
    } else {
      collectBroadcastEvent(value.key, value.value, state)
    }
  }

  override def processElement(event: Event, ctx: ReadContext, out: Output): Unit = {
    val existingWindow = findWindowOpt(event)
    val window = existingWindow.getOrElse(calculateWindow(event))

    val key = event.key
    val aggregateKey = new AggregationResult.KeyType()
    aggregateKey.setAggregationRuleId(key.aggregationDefinitionId)
    aggregateKey.setProjectId(key.projectId)
    aggregateKey.setGroupByFieldValue(event.value.aggregationGroupByFieldValue)

    if (allowAggregationOnWindow(window, event)) {
      val aggregate = if (existingWindow.isEmpty) {
        createAggregate(aggregateKey, event, window)
      } else {
        val state = aggregationState.get(window)
        updateAggregate(aggregateKey, event, state)
      }

      aggregationState.put(window, aggregate)
      out.collect(aggregate)
    }

  }

  @VisibleForTesting
  def calculateWindow(event: Event): Window = {
    val eventValue = event.value
    val interval = Interval(eventValue.intervalType, eventValue.intervalLength)
    val calculator = WindowRangeCalculator(eventValue.windowStartDateTime, interval)
    calculator.calculate(eventValue.eventDateTime)
  }

  override def onTimer(timestamp: Long, ctx: TimerContext, out: Output): Unit = {
    super.onTimer(timestamp, ctx, out)
    aggregationState.keys().asScala.filter(shouldRemoveWindow).foreach(aggregationState.remove)
  }

  @VisibleForTesting
  protected val shouldRemoveWindow: Window => Boolean = { window =>
    val now = DateFormats.nowEpochInMiliAtUtc()
    val policy = appConfig.getPolicyOrDefault(window.interval.intervalType)
    window.howManyCyclesIsAfter(now) > policy.cyclesToKeep
  }

  @VisibleForTesting
  protected def allowAggregationOnWindow(window: Window, event: Types.AggregationOccurrence.KeyedType): Boolean = {
    val windowLimitOpt = event.value.windowCountLimit
    IntervalType.valueOf(event.value.intervalType) match {
      case IntervalType.MINUTES | IntervalType.HOURS =>
        !isWindowIndexGreaterThanWindowCountLimit(window, windowLimitOpt.getOrElse(Long.MaxValue))
      case _ =>
        windowLimitOpt match {
          case None        => true
          case Some(limit) => !isWindowIndexGreaterThanWindowCountLimit(window, limit)
        }
    }
  }

  private def isWindowIndexGreaterThanWindowCountLimit(window: Window, windowCountLimit: Long) =
    window.index > windowCountLimit

  private def findWindowOpt(event: Types.AggregationOccurrence.KeyedType): Option[Window] =
    aggregationState.keys().asScala.find(_.inWindow(event.value.eventDateTime))

  protected def createAggregate(
      keyType: AggregationResult.KeyType,
      source: AggregationOccurrence.KeyedType,
      window: Window): AggregationResult.KeyedType = {
    val value = new AggregationResult.ValueType()
    value.setWindowRangeStartUTC(window.start)
    value.setWindowRangeEndUTC(window.end)
    value.setAggregations(updateAggregationValues(None, source.value))
    new AggregationResult.KeyedType(keyType, value)
  }

  protected def updateAggregate(
      key: AggregationResult.KeyType,
      source: AggregationOccurrence.KeyedType,
      instance: AggregationResult.KeyedType): AggregationResult.KeyedType = {
    val item = instance.value
    val value = new AggregationResult.ValueType()
    value.setWindowRangeStartUTC(item.getWindowRangeStartUTC)
    value.setWindowRangeEndUTC(item.getWindowRangeEndUTC)
    value.setAggregations(updateAggregationValues(Option(item.getAggregations), source.value))
    new AggregationResult.KeyedType(key, value)
  }

  def updateAggregationValues(
      existingValues: Option[AggregationValues],
      aggregationOccurrence: AggregationOccurrence.ValueType): AggregationValues = {
    existingValues match {
      case Some(value) => updateAggregationStats(value, aggregationOccurrence)
      case None        => updateAggregationStats(default(aggregationOccurrence), aggregationOccurrence)
    }
  }

  def updateAggregationStats(
      current: AggregationValues,
      aggregate: AggregationOccurrence.ValueType): AggregationValues = {
    val aggregationValue = new AggregationValues()
    val count = current.getCount + aggregate.count
    val min = Math.min(current.getMin, aggregate.min)
    val max = Math.max(current.getMax, aggregate.max)
    val sum = current.getSum + aggregate.sum
    val custom = aggregate.custom // custom function to perform action
    aggregationValue.setCount(count)
    aggregationValue.setMin(min)
    aggregationValue.setMax(max)
    aggregationValue.setSum(sum)
    aggregationValue.setCustom(custom)
    aggregationValue
  }
}

object AggregationProducerProcessFunction {

  type Event = AggregationOccurrence.KeyedType

  def default(occurrence: AggregationOccurrence.ValueType) =
    new AggregationValues(occurrence.min, occurrence.max, 0, 0.0f, "")

  type ReadContext = KeyedBroadcastProcessFunction[
    AggregationOccurrence.KeyType,
    AggregationOccurrence.KeyedType,
    AggregationControl.KeyedType,
    AggregationResult.KeyedType]#ReadOnlyContext

  type WriteContext = KeyedBroadcastProcessFunction[
    AggregationOccurrence.KeyType,
    AggregationOccurrence.KeyedType,
    AggregationControl.KeyedType,
    AggregationResult.KeyedType]#Context

  type TimerContext = KeyedBroadcastProcessFunction[
    AggregationOccurrence.KeyType,
    AggregationOccurrence.KeyedType,
    AggregationControl.KeyedType,
    AggregationResult.KeyedType]#OnTimerContext

  type Output = Collector[AggregationResult.KeyedType]

  type BroadCastedState = BroadcastState[AggregationControl.KeyType, AggregationControl.ValueType]

  type BroadCastedDescriptor = MapStateDescriptor[AggregationControl.KeyType, AggregationControl.ValueType]
}
