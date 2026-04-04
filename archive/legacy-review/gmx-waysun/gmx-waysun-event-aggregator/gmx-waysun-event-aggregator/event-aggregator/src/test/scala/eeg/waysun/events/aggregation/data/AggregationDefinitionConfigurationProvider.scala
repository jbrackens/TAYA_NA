package eeg.waysun.events.aggregation.data

import stella.dataapi.aggregation.{
  AggregationCondition,
  AggregationInterval,
  AggregationType,
  IntervalDetails,
  IntervalType,
  ConditionType => AggConditionType
}
import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.Types.AggregationDefinition
import eeg.waysun.events.aggregation.Types.AggregationDefinition.ConditionType
import eeg.waysun.events.aggregation.data.AggregationDefinitionConfigurationProvider.ruleId

import scala.collection.JavaConverters._

class AggregationDefinitionConfigurationProvider
    extends DataProvider.WithPayload[
      (Types.AggregationDefinition.KeyType, Types.AggregationDefinition.ValueType),
      Types.AggregationDefinition.ConditionType] {

  override def buildFake(
      item: Int,
      name: String,
      companyId: String,
      payloadData: Option[Seq[ConditionType]]): (AggregationDefinition.KeyType, AggregationDefinition.ValueType) = {
    val key = new AggregationDefinition.KeyType()
    key.setRuleId(ruleId(item))
    key.setProjectId(companyId)
    key.setName(name)
    key.setEventId(s"event-$item")

    val value = new AggregationDefinition.ValueType()
    value.setAggregationType(AggregationType.COUNT)
    value.setAggregationFieldName(EventConfigurationProvider.sampleFields.head._1)

    value.setAggregationConditions(Seq(getAggregationCondition()).toList.asJava)

    val aggregationInterval = new AggregationInterval()
    aggregationInterval.setIntervalType(IntervalType.HOURS)
    val intervalDetails = new IntervalDetails()
    intervalDetails.setLength(AggregationDefinitionConfigurationProvider.intervalLength)
    intervalDetails.setWindowCountLimit(null)
    aggregationInterval.setIntervalDetails(intervalDetails)
    value.setResetFrequency(aggregationInterval)

    value.setAggregationGroupByFieldName(EventConfigurationProvider.sampleFields.head._1)
    (key, value)
  }

  def getAggregationCondition(): AggregationCondition = {
    val condition = new AggregationCondition()
    condition.setValue("0")
    condition.setConditionType(AggConditionType.GE)
    condition.setEventFieldName(EventConfigurationProvider.sampleFields.head._1)
    condition
  }
}

object AggregationDefinitionConfigurationProvider {

  val intervalLength = 10

  def ruleId(item: Int): String = s"agg-ruleid-$item"

  def apply(): AggregationDefinitionConfigurationProvider = new AggregationDefinitionConfigurationProvider()
}
