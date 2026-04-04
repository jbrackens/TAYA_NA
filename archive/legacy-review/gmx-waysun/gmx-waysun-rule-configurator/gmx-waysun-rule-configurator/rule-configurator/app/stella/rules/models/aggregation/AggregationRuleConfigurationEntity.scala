package stella.rules.models.aggregation

import java.time.OffsetDateTime

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.Uppercase
import enumeratum.PlayJsonEnum
import pl.iterators.kebs.json.KebsEnumFormats.jsonEnumFormat
import spray.json.JsonFormat
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AggregationRuleConfigurationId
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.Ids.EventConfigurationId
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.IntervalDetails
import stella.rules.models.aggregation.http.ResetFrequency

final case class AggregationRuleConfigurationEntity(
    id: AggregationRuleConfigurationId,
    ruleId: AggregationRuleConfigurationRuleId,
    projectId: ProjectId,
    name: String,
    description: String,
    eventConfigurationId: EventConfigurationId,
    eventConfigurationEventId: EventConfigurationEventId,
    resetFrequencyInterval: IntervalType,
    windowStartDate: OffsetDateTime,
    resetFrequencyLength: Option[Int],
    windowCountLimit: Option[Int],
    aggregationType: AggregationType,
    aggregationFieldName: String,
    aggregationGroupByFieldName: Option[String],
    isActive: Boolean,
    conditions: List[AggregationRuleConditionEntity],
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toAggregationRuleConfiguration: AggregationRuleConfiguration =
    http.AggregationRuleConfiguration(
      ruleId,
      name,
      description,
      eventConfigurationEventId,
      ResetFrequency(
        resetFrequencyInterval,
        windowStartDate,
        resetFrequencyLength.map(length => IntervalDetails(length, windowCountLimit))),
      aggregationType,
      aggregationFieldName,
      aggregationGroupByFieldName,
      conditions.map(_.toAggregationRuleCondition),
      isActive,
      createdAt,
      updatedAt)
}

sealed trait IntervalType extends EnumEntry with Uppercase with TapirCodecEnumeratum

object IntervalType extends Enum[IntervalType] with PlayJsonEnum[IntervalType] {

  override def values: IndexedSeq[IntervalType] = findValues

  case object Minutes extends IntervalType
  case object Hours extends IntervalType
  case object Days extends IntervalType
  case object Months extends IntervalType
  case object Never extends IntervalType

  implicit lazy val intervalTypeFormat: JsonFormat[IntervalType] = jsonEnumFormat
}

sealed trait AggregationType extends EnumEntry with Uppercase with TapirCodecEnumeratum

object AggregationType extends Enum[AggregationType] with PlayJsonEnum[AggregationType] {

  override def values: IndexedSeq[AggregationType] = findValues

  case object Sum extends AggregationType
  case object Min extends AggregationType
  case object Max extends AggregationType
  case object Count extends AggregationType

  implicit lazy val aggregationTypeFormat: JsonFormat[AggregationType] = jsonEnumFormat
}
