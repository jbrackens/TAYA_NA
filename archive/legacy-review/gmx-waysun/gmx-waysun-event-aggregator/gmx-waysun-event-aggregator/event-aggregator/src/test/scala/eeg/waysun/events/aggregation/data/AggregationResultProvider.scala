package eeg.waysun.events.aggregation.data

import eeg.waysun.events.aggregation.Types
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import stella.dataapi.aggregation.{AggregationResult, AggregationResultKey, AggregationValues}

object AggregationResultProvider {

  case class Parameters(
      projectId: String,
      aggregationDefinitionRuleId: Option[String] = None,
      aggregationFieldValue: Option[String] = None,
      aggregationGroupByFieldValue: Option[String] = None,
      windowRangeStartUTC: Option[Long] = None,
      windowRangeEndUTC: Option[Long] = None,
      aggregationValues: AggregationValues =
        AggregationValues.newBuilder().setMax(0).setMin(0).setSum(0).setCount(1).setCustom("custom").build()) {

    def withWindow(windowRangeStartUTC: Long, windowRangeEndUTC: Long) =
      copy(windowRangeStartUTC = Some(windowRangeStartUTC), windowRangeEndUTC = Some(windowRangeEndUTC))
    def withCount(count: Int) =
      copy(aggregationValues = {
        aggregationValues.setCount(count)
        aggregationValues
      })
  }

  def source(parameters: Parameters): Types.AggregationResult.KeyedType =
    KeyValue(key(parameters), value(parameters))
  def output(parameters: Parameters): Types.AggregationResult.KeyedType = source(parameters)
  def key(parameters: Parameters): Types.AggregationResult.KeyType = {
    import parameters._
    AggregationResultKey
      .newBuilder()
      .setProjectId(projectId)
      .setAggregationRuleId(aggregationDefinitionRuleId.getOrElse("aggregationDefinitionRuleId"))
      .setGroupByFieldValue(aggregationGroupByFieldValue.getOrElse("aggregationGroupByFieldValue"))
      .build()
  }
  def value(parameters: Parameters): Types.AggregationResult.ValueType = {
    import parameters._
    val start = windowRangeStartUTC.getOrElse(Long.MinValue)
    val end = windowRangeEndUTC.getOrElse(Long.MaxValue)
    AggregationResult
      .newBuilder()
      .setWindowRangeStartUTC(start)
      .setWindowRangeEndUTC(end)
      .setAggregations(aggregationValues)
      .build()
  }

}
