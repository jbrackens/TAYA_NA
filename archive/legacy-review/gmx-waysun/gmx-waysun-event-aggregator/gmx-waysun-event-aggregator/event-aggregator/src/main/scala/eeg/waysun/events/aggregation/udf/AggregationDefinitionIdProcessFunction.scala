package eeg.waysun.events.aggregation.udf

import eeg.waysun.events.aggregation.Types.{AggregationCandidate, AggregationDefinition, AggregationOccurrence}
import eeg.waysun.events.aggregation.functions.Value.{BooleanValue, FloatValue, IntegerValue, StringValue}
import eeg.waysun.events.aggregation.functions.{FieldTypeExtractor, Value}
import eeg.waysun.events.aggregation.mappers.FieldValue
import eeg.waysun.events.aggregation.splits.Descriptors
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.job.streams.BroadcastEventCache
import net.flipsports.gmx.streaming.common.logging.JoinedStreamingLogLevels
import org.apache.commons.lang3.StringUtils
import org.apache.flink.api.common.state.{BroadcastState, MapStateDescriptor}
import org.apache.flink.streaming.api.functions.co.KeyedBroadcastProcessFunction
import org.apache.flink.util.Collector
import stella.dataapi.aggregation.{ConditionType, IntervalDetails}
import stella.dataapi.validators.FieldType

import scala.collection.JavaConverters.collectionAsScalaIterableConverter

class AggregationDefinitionIdProcessFunction(implicit val executionParameters: JobExecutionParameters)
    extends KeyedBroadcastProcessFunction[
      AggregationCandidate.KeyType,
      AggregationCandidate.KeyedType,
      AggregationDefinition.KeyedType,
      AggregationOccurrence.KeyedType]
    with BroadcastEventCache[AggregationDefinition.KeyType, AggregationDefinition.KeyedType]
    with JoinedStreamingLogLevels {
  import AggregationDefinitionIdProcessFunction._

  override def processingEventCacheDescriptor: BroadCastedDescriptor = Descriptors.aggregationDefinitions

  def shouldAcceptEvent(
      key: AggregationCandidate.KeyType,
      definition: AggregationDefinition.KeyedType,
      eventOccurrence: AggregationCandidate.KeyedType): Boolean = {
    val event = eventOccurrence.value
    logger.info(s"Got key: $key - $definition - $event")
    val conditions = definition.value.getAggregationConditions.asScala
    val fields = event.fields
    val checkedConditions = conditions.map { condition =>
      val field = fields.filter(_.name.equalsIgnoreCase(condition.getEventFieldName.toString)).head
      val fieldVanillaValue = field.value
      val conditionValue = condition.getValue.toString

      val (fieldValue: Value[Any], definitionConditionValue: Value[Any]) = FieldTypeExtractor(field.fieldType) match {
        case FieldType.String => (StringValue(fieldVanillaValue), StringValue(conditionValue))
        case FieldType.Boolean =>
          (BooleanValue(fieldVanillaValue.toLowerCase.toBoolean), BooleanValue(conditionValue.toLowerCase.toBoolean))
        case FieldType.Float   => (FloatValue(fieldVanillaValue.toFloat), FloatValue(conditionValue.toFloat))
        case FieldType.Integer => (IntegerValue(fieldVanillaValue.toInt), IntegerValue(conditionValue.toInt))
      }

      condition.getConditionType match {
        case ConditionType.EQ  => fieldValue.eq(definitionConditionValue)
        case ConditionType.NEQ => fieldValue.neq(definitionConditionValue)
        case ConditionType.GE  => fieldValue.ge(definitionConditionValue)
        case ConditionType.GT  => fieldValue.gt(definitionConditionValue)
        case ConditionType.LE  => fieldValue.le(definitionConditionValue)
        case ConditionType.LT  => fieldValue.lt(definitionConditionValue)
        case _                 => false
      }
    }.toSeq
    val hasAnyFailedCondition = checkedConditions.contains(false)
    !hasAnyFailedCondition
  }

  def buildValueResult(
      key: AggregationCandidate.KeyType,
      definition: AggregationDefinition.KeyedType,
      item: AggregationCandidate.KeyedType): AggregationOccurrence.ValueType = {
    val event = item.value
    val eventKey = item.key
    logger.info(s"Building aggregation result. $key - $definition - $event")
    val fieldWithAggregationGroupByFieldName =
      event.fields.filter(_.name.equals(definition.value.getAggregationFieldName.toString)).head

    val (aggregationGroupByFieldName, aggregationGroupByFieldValue) =
      if (!StringUtils.isEmpty(definition.value.getAggregationGroupByFieldName)) {
        val name = definition.value.getAggregationGroupByFieldName.toString
        val value = event.fields.filter(_.name.toLowerCase.equals(name.toLowerCase)).head.value
        (name, value)
      } else {
        ("", "")
      }

    val fieldValue = FieldValue(fieldWithAggregationGroupByFieldName)

    new AggregationOccurrence.ValueType(
      eventDateTime = event.eventDateTime,
      eventName = event.eventName,
      projectId = eventKey.projectId,
      uuid = event.uuid,
      aggregationDefinitionRuleId = key.aggregationDefinitionId,
      eventDefinitionRuleId = eventKey.eventDefinitionId,
      aggregationFieldName = definition.value.getAggregationFieldName.toString,
      aggregationGroupByFieldName = aggregationGroupByFieldName,
      aggregationGroupByFieldValue = aggregationGroupByFieldValue,
      aggregationFieldType = fieldWithAggregationGroupByFieldName.fieldType,
      aggregationFieldValue = fieldWithAggregationGroupByFieldName.value,
      intervalType = definition.value.getResetFrequency.getIntervalType.toString,
      windowStartDateTime = definition.value.getResetFrequency.getWindowStartDateUTC,
      windowCountLimit = getWindowCountLimit(definition.value.getResetFrequency.getIntervalDetails),
      intervalLength = getIntervalLength(definition.value.getResetFrequency.getIntervalDetails),
      sum = fieldValue.asFloat,
      min = fieldValue.asFloat,
      max = fieldValue.asFloat,
      count = 1,
      custom = fieldValue.asString)
  }

  def getIntervalLength(resetFrequency: IntervalDetails): Int = {
    if (resetFrequency == null) {
      0
    } else {
      resetFrequency.getLength
    }
  }

  def getWindowCountLimit(resetFrequency: IntervalDetails): Option[Long] = {
    if (resetFrequency == null || resetFrequency.getWindowCountLimit == null) {
      None
    } else {
      Some(resetFrequency.getWindowCountLimit.longValue())
    }
  }

  def buildKeyResult(candidate: AggregationCandidate.KeyedType): AggregationOccurrence.KeyType = candidate.key

  override def processElement(value: AggregationCandidate.KeyedType, ctx: ReadContext, out: Output): Unit = {
    val state = ctx.getBroadcastState(processingEventCacheDescriptor)
    val definitionKey = new AggregationDefinition.KeyType()
    definitionKey.setName(value.key.eventName)
    definitionKey.setRuleId(value.key.aggregationDefinitionId)
    definitionKey.setEventId(value.key.eventDefinitionId)
    definitionKey.setProjectId(value.key.projectId)
    if (value.key.eventName.equalsIgnoreCase(value.value.eventName)) {
      forSingleBroadcastEvent(definitionKey, state) { definition =>
        if (shouldAcceptEvent(value.key, definition, value)) {
          val key = buildKeyResult(value)
          val resultValue = buildValueResult(value.key, definition, value)
          out.collect(new AggregationOccurrence.KeyedType(key, resultValue))
        }
      }
    }
  }

  override def processBroadcastElement(value: AggregationDefinition.KeyedType, ctx: WriteContext, out: Output): Unit = {
    val state = ctx.getBroadcastState(processingEventCacheDescriptor)
    if (value.isValueNull()) {
      removeBroadcastEvent(value.key, state)
    } else {
      collectBroadcastEvent(value.key, value, state)
    }
  }

}

object AggregationDefinitionIdProcessFunction {

  type ReadContext = KeyedBroadcastProcessFunction[
    AggregationCandidate.KeyType,
    AggregationCandidate.KeyedType,
    AggregationDefinition.KeyedType,
    AggregationOccurrence.KeyedType]#ReadOnlyContext

  type WriteContext = KeyedBroadcastProcessFunction[
    AggregationCandidate.KeyType,
    AggregationCandidate.KeyedType,
    AggregationDefinition.KeyedType,
    AggregationOccurrence.KeyedType]#Context

  type Output = Collector[AggregationOccurrence.KeyedType]

  type BroadCastedState = BroadcastState[AggregationDefinition.KeyType, AggregationDefinition.KeyedType]

  type BroadCastedDescriptor = MapStateDescriptor[AggregationDefinition.KeyType, AggregationDefinition.KeyedType]
}
