package stella.achievement.db

import enumeratum.SlickEnumSupport

import stella.achievement.models.ActionType
import stella.achievement.models.FieldValueType
import stella.achievement.models.RequestType

trait CommonMappers extends SlickEnumSupport {
  implicit lazy val fieldValueTypeMapper: profile.BaseColumnType[FieldValueType] =
    mappedColumnTypeForLowercaseEnum(FieldValueType)
  implicit lazy val achievementActionTypeMapper: profile.BaseColumnType[ActionType] =
    mappedColumnTypeForLowercaseEnum(ActionType)
  implicit lazy val achievementRequestTypeMapper: profile.BaseColumnType[RequestType] =
    mappedColumnTypeForLowercaseEnum(RequestType)
}
