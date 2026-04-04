package stella.rules.db

import enumeratum.SlickEnumSupport

import stella.rules.models.achievement.AchievementTriggerBehaviour
import stella.rules.models.achievement.ActionType
import stella.rules.models.achievement.OperationType
import stella.rules.models.achievement.RequestType
import stella.rules.models.aggregation.AggregationConditionType
import stella.rules.models.aggregation.AggregationType
import stella.rules.models.aggregation.IntervalType
import stella.rules.models.event.FieldValueType

trait CommonMappers extends SlickEnumSupport {
  implicit lazy val eventFieldValueTypeMapper: profile.BaseColumnType[FieldValueType] =
    mappedColumnTypeForLowercaseEnum(FieldValueType)
  implicit lazy val aggregationIntervalMapper: profile.BaseColumnType[IntervalType] =
    mappedColumnTypeForLowercaseEnum(IntervalType)
  implicit lazy val aggregationTypeMapper: profile.BaseColumnType[AggregationType] =
    mappedColumnTypeForUppercaseEnum(AggregationType)
  implicit lazy val aggregationConditionTypeMapper: profile.BaseColumnType[AggregationConditionType] =
    mappedColumnTypeForUppercaseEnum(AggregationConditionType)
  implicit lazy val achievementTriggerBehaviourMapper: profile.BaseColumnType[AchievementTriggerBehaviour] =
    mappedColumnTypeForLowercaseEnum(AchievementTriggerBehaviour)
  implicit lazy val achievementActionTypeMapper: profile.BaseColumnType[ActionType] =
    mappedColumnTypeForLowercaseEnum(ActionType)
  implicit lazy val achievementOperationTypeMapper: profile.BaseColumnType[OperationType] =
    mappedColumnTypeForLowercaseEnum(OperationType)
  implicit lazy val achievementRequestTypeMapper: profile.BaseColumnType[RequestType] =
    mappedColumnTypeForLowercaseEnum(RequestType)
}
