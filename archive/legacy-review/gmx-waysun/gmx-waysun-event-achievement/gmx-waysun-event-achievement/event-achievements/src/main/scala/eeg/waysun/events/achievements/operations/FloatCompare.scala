package eeg.waysun.events.achievements.operations

import stella.dataapi.achievement.ConditionType

case class FloatCompare(operator: ConditionType, aggregatedValue: Float, referenceValue: Float)
    extends AchievementMatchedCondition[Float] {

  def matchedCondition: Boolean = operator match {
    case ConditionType.EQ  => aggregatedValue == referenceValue
    case ConditionType.GE  => aggregatedValue >= referenceValue
    case ConditionType.GT  => aggregatedValue > referenceValue
    case ConditionType.LE  => aggregatedValue <= referenceValue
    case ConditionType.LT  => aggregatedValue < referenceValue
    case ConditionType.NEQ => aggregatedValue != referenceValue
    case _                 => false
  }
}
object FloatCompare {

  def apply(
      operator: ConditionType,
      aggregatedValue: Float,
      referenceValue: Float): AchievementMatchedCondition[AnyVal] =
    new FloatCompare(operator, aggregatedValue, referenceValue).asInstanceOf[AchievementMatchedCondition[AnyVal]]

}
