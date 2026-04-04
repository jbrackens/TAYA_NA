package eeg.waysun.events.achievements

import stella.dataapi.achievement.ConditionType
import eeg.waysun.events.achievements.streams.dto.NumberBag

package object operations {
  type FloatOrInt = Either[NumberBag[Float], NumberBag[Int]]
  type OperationMatchedWithValue = (AchievementMatchedCondition[AnyVal], NumberBag[AnyVal])

  def compare(operation: FloatOrInt, condition: ConditionType): OperationMatchedWithValue = operation match {
    case Left(value) =>
      (FloatCompare(condition, value.aggregate, value.achievementDefinition), value.asInstanceOf[NumberBag[AnyVal]])
    case Right(value) =>
      (IntCompare(condition, value.aggregate, value.achievementDefinition), value.asInstanceOf[NumberBag[AnyVal]])
  }

}
