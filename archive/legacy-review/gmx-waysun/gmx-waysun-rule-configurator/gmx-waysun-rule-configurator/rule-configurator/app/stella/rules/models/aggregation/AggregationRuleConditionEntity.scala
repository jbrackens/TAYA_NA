package stella.rules.models.aggregation

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.Uppercase
import enumeratum.PlayJsonEnum
import pl.iterators.kebs.json.KebsEnumFormats.jsonEnumFormat
import spray.json.JsonFormat
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import stella.rules.models.Ids.AggregationRuleConditionId
import stella.rules.models.Ids.AggregationRuleConfigurationId
import stella.rules.models.aggregation.http.AggregationRuleCondition

final case class AggregationRuleConditionEntity(
    id: AggregationRuleConditionId,
    configurationId: AggregationRuleConfigurationId,
    eventFieldName: String,
    conditionType: AggregationConditionType,
    value: Option[String]) {

  def toAggregationRuleCondition: AggregationRuleCondition =
    AggregationRuleCondition(eventFieldName, conditionType, value)
}

sealed trait AggregationConditionType extends EnumEntry with Uppercase with TapirCodecEnumeratum

object AggregationConditionType extends Enum[AggregationConditionType] with PlayJsonEnum[AggregationConditionType] {
  override def values: IndexedSeq[AggregationConditionType] = findValues

  case object Eq extends AggregationConditionType
  case object Neq extends AggregationConditionType
  case object Lt extends AggregationConditionType
  case object Le extends AggregationConditionType
  case object Gt extends AggregationConditionType
  case object Ge extends AggregationConditionType
  case object Nn extends AggregationConditionType

  implicit lazy val aggregationConditionTypeFormat: JsonFormat[AggregationConditionType] = jsonEnumFormat
}
