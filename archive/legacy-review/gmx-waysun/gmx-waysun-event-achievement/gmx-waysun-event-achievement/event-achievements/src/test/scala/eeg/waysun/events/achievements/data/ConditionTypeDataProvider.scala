package eeg.waysun.events.achievements.data

import stella.dataapi.achievement.ConditionType
import eeg.waysun.events.achievements.Types.DefinitionType.{ConditionType => Condition}

case class ConditionTypeDataProvider(
    aggregationRuleBuilder: AggregationRuleIdBuilder,
    aggregationGroupByFieldBuilder: AggregationGroupByFieldBuilder) {

  private val aggregationRuleId: String = aggregationRuleBuilder.id()

  private val aggregationField: String = aggregationGroupByFieldBuilder.groupBy()

  private def buildNewCondition(cType: ConditionType, value: String, field: Option[String]) =
    new Condition(aggregationRuleId, field.getOrElse(aggregationField), cType, value)

  def eq(value: String, field: Option[String] = None): Condition = buildNewCondition(ConditionType.EQ, value, field)

  def neq(value: String, field: Option[String] = None): Condition = buildNewCondition(ConditionType.NEQ, value, field)

  def lt(value: String, field: Option[String] = None): Condition = buildNewCondition(ConditionType.LT, value, field)

  def le(value: String, field: Option[String] = None): Condition = buildNewCondition(ConditionType.LE, value, field)

  def gt(value: String, field: Option[String] = None): Condition = buildNewCondition(ConditionType.GT, value, field)

  def ge(value: String, field: Option[String] = None): Condition = buildNewCondition(ConditionType.GE, value, field)

  def nn(value: String, field: Option[String] = None): Condition = buildNewCondition(ConditionType.NN, value, field)

}
