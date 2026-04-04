package eeg.waysun.events.achievements.mappers

import stella.dataapi.achievement.event.{ActionType, EventDetails, EventField}
import stella.dataapi.achievement.{EventConfiguration, OperationType}
import stella.dataapi.aggregation.AggregationValues
import eeg.waysun.events.achievements.Types._
import net.flipsports.gmx.streaming.common.conversion.DateFormats

import java.util
import java.util.UUID
import scala.collection.JavaConverters._

final case class AchievementOccurrenceMapper(
    event: AggregatedType.Wrapped,
    definitionKey: DefinitionType.KeyType,
    definitionValue: DefinitionType.ValueType)
    extends Serializable {

  lazy val aggregationValues: AggregationValues = event.value.get.getAggregations

  def toAchievement: AchievedType.Source = {
    val key = new AchievedType.KeyType()
    key.setAchievementRuleId(definitionKey.getAchievementRuleId)
    key.setProjectId(definitionKey.getProjectId)
    key.setAchievementEventId(UUID.randomUUID().toString)
    val value = new AchievedType.ValueType()
    value.setGroupByFieldValue(event.key.getGroupByFieldValue)
    value.setActionType(ActionType.EVENT)
    value.setWindowRangeEndUTC(event.value.get.getWindowRangeEndUTC)
    value.setWindowRangeStartUTC(event.value.get.getWindowRangeStartUTC)
    value.setMessageOriginDateUTC(DateFormats.nowEpochInMiliAtUtc())
    value.setEventDetails(toEventDetails)
    new AchievedType.Source(key, value)
  }

  private def toEventDetails: EventDetails = {
    val eventDetails = new EventDetails()
    val eventConfiguration = Option(definitionValue.getEventConfiguration).getOrElse(new EventConfiguration())
    val eventFieldsConfiguration = Option(eventConfiguration.fields).getOrElse(new util.ArrayList())
    val eventFields = eventFieldsConfiguration.asScala.map { field =>
      {
        val eventField = new EventField()
        eventField.setName(field.getFieldName.toString)
        eventField.setValue(OperationType.valueOf(field.getOperationType.toString) match {
          case OperationType.STATIC       => field.getValue.toString
          case OperationType.REPLACE_FROM => valueFrom(field.getValue.toString)
        })
        eventField.setValueType(OperationType.valueOf(field.getOperationType.toString) match {
          case OperationType.STATIC       => "string"
          case OperationType.REPLACE_FROM => valueTypeFrom(field.getValue.toString)
        })
        eventField
      }
    }

    eventDetails.setFields(eventFields.toList.asJava)
    eventDetails.setEventName(definitionValue.getName)
    eventDetails
  }

  // temporary hardcode
  private def valueFrom(item: String): CharSequence = item match {
    case "sum"               => aggregationValues.getSum.toString
    case "min"               => aggregationValues.getMin.toString
    case "max"               => aggregationValues.getMax.toString
    case "count"             => aggregationValues.getCount.toString
    case "groupByFieldValue" => event.key.getGroupByFieldValue.toString
    case _                   => aggregationValues.getCustom.toString
  }
  private def valueTypeFrom(item: String): CharSequence = item match {
    case "sum"               => "float"
    case "min"               => "float"
    case "max"               => "float"
    case "count"             => "integer"
    case "groupByFieldValue" => "string"
    case _                   => "string"
  }
}
