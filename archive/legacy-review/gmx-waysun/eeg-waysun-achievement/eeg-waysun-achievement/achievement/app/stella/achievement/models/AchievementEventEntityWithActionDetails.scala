package stella.achievement.models

import java.time.OffsetDateTime

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.LowerCamelcase
import enumeratum.EnumEntry.Lowercase
import enumeratum.PlayJsonEnum
import pl.iterators.kebs.json.KebsEnumFormats.jsonEnumFormat
import spray.json.JsonFormat
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import stella.common.models.Ids._

import stella.achievement.models.Ids._

final case class AchievementEventEntityWithActionDetails(
    id: AchievementEventId,
    projectId: ProjectId,
    achievementRuleId: AchievementConfigurationRulePublicId,
    achievementOriginDate: OffsetDateTime,
    groupByFieldValue: String,
    actionType: ActionType,
    windowRangeStart: Option[OffsetDateTime],
    windowRangeEnd: Option[OffsetDateTime],
    achievementEventDetails: Option[AchievementEventDetailsEntityWithFields],
    achievementWebhookDetails: Option[AchievementWebhookDetailsEntityWithFields],
    createdAt: OffsetDateTime) {

  def toAchievementEventEntity: AchievementEventEntity =
    AchievementEventEntity(
      id = id,
      projectId = projectId,
      achievementRuleId = achievementRuleId,
      achievementOriginDate = achievementOriginDate,
      groupByFieldValue = groupByFieldValue,
      actionType = actionType,
      windowRangeStart = windowRangeStart,
      windowRangeEnd = windowRangeEnd,
      achievementEventDetailsId = achievementEventDetails.map(_.id),
      achievementWebhookDetailsId = achievementWebhookDetails.map(_.id),
      createdAt = createdAt)

  def toAchievementEvent: AchievementEvent =
    AchievementEvent(
      achievementOriginDate = achievementOriginDate,
      groupByFieldValue = groupByFieldValue,
      windowRangeStart = windowRangeStart,
      windowRangeEnd = windowRangeEnd,
      action = action,
      createdAt = createdAt)

  private def action: AchievementActionDetails = {
    val actionDetails = (achievementEventDetails, achievementWebhookDetails) match {
      case (Some(eventActionDetails), None) =>
        AchievementEventActionDetails(
          eventId = eventActionDetails.eventConfigurationId,
          fields = eventActionDetails.fields.map(_.toEventField))
      case (None, Some(webhookActionDetails)) =>
        AchievementWebhookActionDetails(
          requestType = webhookActionDetails.requestType,
          targetUrl = webhookActionDetails.url,
          eventConfig = webhookActionDetails.eventConfigurationId.map(id =>
            WebhookEventDetails(eventId = id, fields = webhookActionDetails.fields.map(_.toEventField))))
      case (None, None) => // it shouldn't happen
        throw new RuntimeException(
          s"Action configuration is missing for achievement event with rule id $achievementRuleId for project $projectId")
      case _ => // it shouldn't happen
        throw new RuntimeException(
          s"Achievement event with rule id $achievementRuleId for project $projectId has specified more than one action")
    }
    AchievementActionDetails(actionDetails.actionType, actionDetails)
  }
}

final case class AchievementEventEntity(
    id: AchievementEventId,
    projectId: ProjectId,
    achievementRuleId: AchievementConfigurationRulePublicId,
    achievementOriginDate: OffsetDateTime,
    groupByFieldValue: String,
    actionType: ActionType,
    windowRangeStart: Option[OffsetDateTime],
    windowRangeEnd: Option[OffsetDateTime],
    achievementEventDetailsId: Option[AchievementEventDetailsId],
    achievementWebhookDetailsId: Option[AchievementWebhookDetailsId],
    createdAt: OffsetDateTime) {

  def withDetails(
      eventDetails: Option[AchievementEventDetailsEntityWithFields],
      webhookDetails: Option[AchievementWebhookDetailsEntityWithFields]): AchievementEventEntityWithActionDetails = {
    require(
      List(eventDetails, webhookDetails).count(_.nonEmpty) == 1,
      s"Exactly one of eventDetails, webhookDetails should be non-empty but was $eventDetails and $webhookDetails")
    require(
      eventDetails.map(_.id) == achievementEventDetailsId,
      s"Event details id in event details and achievement event entity should be the same but was ${eventDetails.map(
        _.id)} and $achievementEventDetailsId")
    require(
      webhookDetails.map(_.id) == achievementWebhookDetailsId,
      s"Webhook details id in webhook details and achievement event entity should be the same but was ${webhookDetails
        .map(_.id)} and $achievementWebhookDetailsId")

    AchievementEventEntityWithActionDetails(
      id = id,
      projectId = projectId,
      achievementRuleId = achievementRuleId,
      achievementOriginDate = achievementOriginDate,
      groupByFieldValue = groupByFieldValue,
      actionType = actionType,
      windowRangeStart = windowRangeStart,
      windowRangeEnd = windowRangeEnd,
      achievementEventDetails = eventDetails,
      achievementWebhookDetails = webhookDetails,
      createdAt = createdAt)
  }
}

sealed trait ActionType extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum

object ActionType extends Enum[ActionType] with PlayJsonEnum[ActionType] {

  override def values: IndexedSeq[ActionType] = findValues

  case object Event extends ActionType
  case object Webhook extends ActionType

  implicit lazy val actionTypeFormat: JsonFormat[ActionType] = jsonEnumFormat
}

final case class AchievementEventDetailsEntityWithFields(
    id: AchievementEventDetailsId,
    eventConfigurationId: EventConfigurationPublicId,
    fields: List[AchievementEventDetailsFieldEntity],
    createdAt: OffsetDateTime) {

  def toEventDetailsEntity: AchievementEventDetailsEntity =
    AchievementEventDetailsEntity(id, eventConfigurationId, createdAt)
}

final case class AchievementEventDetailsEntity(
    id: AchievementEventDetailsId,
    eventConfigurationId: EventConfigurationPublicId,
    createdAt: OffsetDateTime)

final case class AchievementEventDetailsFieldEntity(
    id: AchievementEventDetailsFieldId,
    achievementEventDetailsId: AchievementEventDetailsId,
    fieldName: String,
    valueType: FieldValueType,
    value: String,
    createAt: OffsetDateTime) {

  def toEventField: EventField =
    EventField(fieldName = fieldName, valueType = valueType, value = value)
}

final case class AchievementWebhookDetailsEntityWithFields(
    id: AchievementWebhookDetailsId,
    eventConfigurationId: Option[EventConfigurationPublicId],
    requestType: RequestType,
    url: String,
    fields: List[AchievementWebhookDetailsFieldEntity],
    createdAt: OffsetDateTime) {

  def toWebhookDetailsEntity: AchievementWebhookDetailsEntity =
    AchievementWebhookDetailsEntity(id, eventConfigurationId, requestType, url, createdAt)
}

final case class AchievementWebhookDetailsEntity(
    id: AchievementWebhookDetailsId,
    eventConfigurationId: Option[EventConfigurationPublicId],
    requestType: RequestType,
    url: String,
    createdAt: OffsetDateTime)

final case class AchievementWebhookDetailsFieldEntity(
    id: AchievementWebhookDetailsFieldId,
    achievementWebhookDetailsId: AchievementWebhookDetailsId,
    fieldName: String,
    valueType: FieldValueType,
    value: String,
    createAt: OffsetDateTime) {

  def toEventField: EventField =
    EventField(fieldName = fieldName, valueType = valueType, value = value)
}

sealed trait FieldValueType extends EnumEntry with Lowercase with TapirCodecEnumeratum

object FieldValueType extends Enum[FieldValueType] with PlayJsonEnum[FieldValueType] {
  def values: IndexedSeq[FieldValueType] = findValues

  case object Boolean extends FieldValueType
  case object String extends FieldValueType
  case object Integer extends FieldValueType
  case object Float extends FieldValueType

  implicit lazy val fieldValueTypeFormat: JsonFormat[FieldValueType] = jsonEnumFormat
}

sealed trait RequestType extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum

object RequestType extends Enum[RequestType] with PlayJsonEnum[RequestType] {

  override def values: IndexedSeq[RequestType] = findValues

  case object Get extends RequestType
  case object Post extends RequestType
  case object Put extends RequestType
  case object Patch extends RequestType
  case object Delete extends RequestType

  implicit lazy val requestTypeFormat: JsonFormat[RequestType] = jsonEnumFormat
}
