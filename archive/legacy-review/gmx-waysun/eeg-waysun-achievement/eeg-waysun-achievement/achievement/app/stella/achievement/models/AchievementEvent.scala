package stella.achievement.models

import java.time.OffsetDateTime

import play.api.libs.json.Json
import play.api.libs.json.OFormat
import spray.json.DefaultJsonProtocol._
import spray.json.JsObject
import spray.json.JsValue
import spray.json.RootJsonFormat
import spray.json.enrichAny
import sttp.tapir.Schema

import stella.common.http.json.JsonFormats.offsetDateTimeFormat

import stella.achievement.models.Ids.EventConfigurationPublicId
import stella.achievement.models.Ids.EventConfigurationPublicId._

final case class AchievementEvent(
    achievementOriginDate: OffsetDateTime,
    groupByFieldValue: String,
    windowRangeStart: Option[OffsetDateTime],
    windowRangeEnd: Option[OffsetDateTime],
    action: AchievementActionDetails,
    createdAt: OffsetDateTime)

object AchievementEvent {
  implicit lazy val achievementEventFormat: RootJsonFormat[AchievementEvent] = jsonFormat6(AchievementEvent.apply)

  implicit lazy val achievementEventSchema: Schema[AchievementEvent] =
    Schema.derived[AchievementEvent]
}

final case class AchievementActionDetails(actionType: ActionType, details: AchievementActionDetailsPayload) {
  require(actionType == details.actionType, "actionType and details type should match")
}

object AchievementActionDetails {

  implicit lazy val achievementActionDetailsFormat: RootJsonFormat[AchievementActionDetails] = jsonFormat2(
    AchievementActionDetails.apply)

  implicit lazy val achievementActionDetailsPlayFormat: OFormat[AchievementActionDetails] =
    Json.format[AchievementActionDetails]

  implicit lazy val achievementActionDetailsSchema: Schema[AchievementActionDetails] =
    Schema.derived[AchievementActionDetails]

  def apply(details: AchievementEventActionDetails): AchievementActionDetails =
    AchievementActionDetails(ActionType.Event, details)

  def apply(details: AchievementWebhookActionDetails): AchievementActionDetails =
    AchievementActionDetails(ActionType.Webhook, details)
}

sealed trait AchievementActionDetailsPayload {
  def actionType: ActionType
}

object AchievementActionDetailsPayload {
  private val eventIdField = "eventId"
  private val fieldsField = "fields"

  implicit lazy val achievementActionPayloadFormat: RootJsonFormat[AchievementActionDetailsPayload] =
    new RootJsonFormat[AchievementActionDetailsPayload] {
      override def write(obj: AchievementActionDetailsPayload): JsValue = obj match {
        case p: AchievementEventActionDetails   => p.toJson
        case p: AchievementWebhookActionDetails => p.toJson
      }

      override def read(json: JsValue): AchievementActionDetailsPayload = json match {
        case obj: JsObject if containsAchievementEventActionDetailsFields(obj) =>
          json.convertTo[AchievementEventActionDetails]
        case _ => json.convertTo[AchievementWebhookActionDetails]
      }

      private def containsAchievementEventActionDetailsFields(obj: JsObject): Boolean = {
        val fieldNames = obj.fields.toList.map(_._1)
        List(eventIdField, fieldsField).forall(fieldNames.contains)
      }
    }

  implicit lazy val achievementActionDetailsPayloadPlayFormat: OFormat[AchievementActionDetailsPayload] =
    Json.format[AchievementActionDetailsPayload]

  implicit lazy val achievementActionDetailsPayloadSchema: Schema[AchievementActionDetailsPayload] =
    Schema.derived[AchievementActionDetailsPayload]
}

final case class AchievementEventActionDetails(eventId: EventConfigurationPublicId, fields: List[EventField])
    extends AchievementActionDetailsPayload {
  override def actionType: ActionType = ActionType.Event
}

object AchievementEventActionDetails {
  implicit lazy val achievementEventActionDetailsFormat: RootJsonFormat[AchievementEventActionDetails] = jsonFormat2(
    AchievementEventActionDetails.apply)

  implicit lazy val achievementEventActionDetailsPlayFormat: OFormat[AchievementEventActionDetails] =
    Json.format[AchievementEventActionDetails]

  implicit lazy val achievementEventActionDetailsSchema: Schema[AchievementEventActionDetails] =
    Schema.derived[AchievementEventActionDetails]
}

final case class AchievementWebhookActionDetails(
    requestType: RequestType,
    targetUrl: String,
    eventConfig: Option[WebhookEventDetails])
    extends AchievementActionDetailsPayload {

  override def actionType: ActionType = ActionType.Webhook
}

object AchievementWebhookActionDetails {

  implicit lazy val achievementWebhookActionDetailsFormat: RootJsonFormat[AchievementWebhookActionDetails] =
    jsonFormat3(AchievementWebhookActionDetails.apply)

  implicit lazy val achievementWebhookActionDetailsPlayFormat: OFormat[AchievementWebhookActionDetails] =
    Json.format[AchievementWebhookActionDetails]

  implicit lazy val achievementWebhookActionDetailsSchema: Schema[AchievementWebhookActionDetails] =
    Schema.derived[AchievementWebhookActionDetails]
}

final case class WebhookEventDetails(eventId: EventConfigurationPublicId, fields: List[EventField])

object WebhookEventDetails {
  implicit lazy val webhookEventDetailsFormat: RootJsonFormat[WebhookEventDetails] = jsonFormat2(
    WebhookEventDetails.apply)

  implicit lazy val webhookEventDetailsPlayFormat: OFormat[WebhookEventDetails] =
    Json.format[WebhookEventDetails]

  implicit lazy val webhookEventDetailsSchema: Schema[WebhookEventDetails] =
    Schema.derived[WebhookEventDetails]
}

final case class EventField(fieldName: String, valueType: FieldValueType, value: String)

object EventField {
  implicit lazy val eventFieldFormat: RootJsonFormat[EventField] = jsonFormat3(EventField.apply)
  implicit lazy val eventFieldPlayFormat: OFormat[EventField] = Json.format[EventField]
  implicit lazy val eventFieldSchema: Schema[EventField] = Schema.derived[EventField]
}
