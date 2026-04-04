package eeg.waysun.events.aggregation.data

import eeg.waysun.events.aggregation.Types
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import stella.dataapi.aggregation.{AggregationInterval, AggregationValues, IntervalDetails, IntervalType}

import java.time.Instant
import java.util.UUID

object AggregationOccurrenceProvider {

  case class Parameters(
      userId: String,
      projectId: String,
      eventName: String,
      eventDateTime: Option[Instant] = None,
      windowStartDateTime: Option[Instant] = None,
      aggregationDefinitionRuleId: Option[String] = None,
      eventDefinitionRuleId: Option[String] = None,
      aggregationFieldName: Option[String] = None,
      aggregationFieldValue: Option[String] = None,
      aggregationFieldType: Option[String] = None,
      aggregationGroupByFieldName: Option[String] = None,
      aggregationGroupByFieldValue: Option[String] = None,
      payloadData: Option[AggregationValues] = None) {
    def withEventDateTime(date: Instant): Parameters = copy(eventDateTime = Some(date))
  }

  def source(parameters: Parameters): Types.AggregationOccurrence.Source = {
    val source = keyWithValue(parameters)
    new Types.AggregationOccurrence.Source(source._1, source._2)
  }

  def keyed(parameters: Parameters): Types.AggregationOccurrence.KeyedType =
    KeyValue.fromTuple(keyWithValue(parameters))

  def output(parameters: Parameters): Types.AggregationOccurrence.KeyedType = keyed(parameters)

  def value(parameters: Parameters): Types.AggregationOccurrence.ValueType = keyWithValue(parameters)._2

  def keyWithValue(
      parameters: Parameters): (Types.AggregationOccurrence.KeyType, Types.AggregationOccurrence.ValueType) = {
    import parameters._
    val givenAggregationValues = payloadData.getOrElse(
      AggregationValues.newBuilder().setMax(0).setMin(0).setSum(0).setCount(1).setCustom("custom").build())
    val aggregationInterval = new AggregationInterval()
    aggregationInterval.setIntervalType(IntervalType.MINUTES)
    val intervalDetails = new IntervalDetails()
    intervalDetails.setLength(AggregationDefinitionConfigurationProvider.intervalLength)
    intervalDetails.setWindowCountLimit(0)
    aggregationInterval.setIntervalDetails(intervalDetails)
    val value = new Types.AggregationOccurrence.ValueType(
      eventDateTime = eventDateTime.getOrElse(Instant.now()).toEpochMilli,
      eventName = eventName,
      projectId = projectId,
      uuid = UUID.randomUUID().toString,
      aggregationDefinitionRuleId = aggregationDefinitionRuleId.getOrElse("aggregationDefinitionRuleId"),
      eventDefinitionRuleId = eventDefinitionRuleId.getOrElse("eventDefinitionRuleId"),
      aggregationFieldName = aggregationFieldName.getOrElse("aggregationFieldName"),
      aggregationFieldValue = aggregationFieldValue.getOrElse("aggregationFieldValue"),
      aggregationFieldType = aggregationFieldType.getOrElse("aggregationFieldType"),
      aggregationGroupByFieldName = aggregationGroupByFieldName.getOrElse("aggregationGroupByFieldName"),
      aggregationGroupByFieldValue = aggregationGroupByFieldValue.getOrElse("aggregationGroupByFieldValue"),
      intervalType = aggregationInterval.intervalType.toString,
      intervalLength = intervalDetails.length,
      windowStartDateTime = windowStartDateTime.getOrElse(Instant.now()).toEpochMilli - 10000,
      windowCountLimit = Some(Int.MaxValue),
      count = givenAggregationValues.count,
      min = givenAggregationValues.min,
      max = givenAggregationValues.max,
      sum = givenAggregationValues.sum,
      custom = givenAggregationValues.custom.toString)

    val key = new Types.AggregationOccurrence.KeyType(
      projectId = value.projectId,
      userId = userId,
      eventDefinitionId = value.eventDefinitionRuleId,
      eventName = value.eventName,
      aggregationDefinitionId = value.aggregationDefinitionRuleId)

    (key, value)
  }

}
