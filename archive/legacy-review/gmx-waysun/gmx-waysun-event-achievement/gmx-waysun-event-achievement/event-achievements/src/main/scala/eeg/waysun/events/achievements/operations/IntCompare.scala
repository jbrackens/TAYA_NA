package eeg.waysun.events.achievements.operations

import stella.dataapi.achievement.ConditionType

case class IntCompare(operator: ConditionType, aggregatedValue: Int, referenceValue: Int)
    extends AchievementMatchedCondition[Int] {

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

object IntCompare {

  def apply(operator: ConditionType, aggregatedValue: Int, referenceValue: Int): AchievementMatchedCondition[AnyVal] =
    new IntCompare(operator, aggregatedValue, referenceValue).asInstanceOf[AchievementMatchedCondition[AnyVal]]
}
