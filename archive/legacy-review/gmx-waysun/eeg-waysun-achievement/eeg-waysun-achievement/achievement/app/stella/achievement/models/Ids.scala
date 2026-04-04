package stella.achievement.models

import java.util.UUID

import pl.iterators.kebs.tagged._
import play.api.libs.json.Format
import play.api.libs.json.JsResult
import play.api.libs.json.{JsValue => PlayJsValue}
import pureconfig.ConfigReader
import spray.json.JsValue
import spray.json.RootJsonFormat
import sttp.tapir.Codec
import sttp.tapir.Codec.parsedString
import sttp.tapir.CodecFormat.TextPlain
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SString

import stella.common.http.json.JsonFormats.uuidFormat
import stella.common.models.Ids._

import stella.achievement.routes.ResponseFormats.uuidPlayFormat

object Ids {

  trait AchievementConfigurationRulePublicIdTag
  trait EventConfigurationPublicIdTag

  trait AchievementEventIdTag
  trait AchievementEventDetailsIdTag
  trait AchievementEventDetailsFieldIdTag
  trait AchievementWebhookDetailsIdTag
  trait AchievementWebhookDetailsFieldIdTag

  type AchievementConfigurationRulePublicId = UUID @@ AchievementConfigurationRulePublicIdTag
  type EventConfigurationPublicId = UUID @@ EventConfigurationPublicIdTag

  type AchievementEventId = Long @@ AchievementEventIdTag
  type AchievementEventDetailsId = Long @@ AchievementEventDetailsIdTag
  type AchievementEventDetailsFieldId = Long @@ AchievementEventDetailsFieldIdTag
  type AchievementWebhookDetailsId = Long @@ AchievementWebhookDetailsIdTag
  type AchievementWebhookDetailsFieldId = Long @@ AchievementWebhookDetailsFieldIdTag

  object ProjectIdInstances {
    implicit lazy val projectIdSchema: Schema[ProjectId] =
      Schema[ProjectId](SString()).format("uuid")

    implicit lazy val projectIdFormat: RootJsonFormat[ProjectId] =
      new RootJsonFormat[ProjectId] {
        override def read(value: JsValue): ProjectId = ProjectId(uuidFormat.read(value))

        override def write(id: ProjectId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val projectIdCodec: Codec[String, ProjectId, TextPlain] =
      parsedString[ProjectId](str => ProjectId(UUID.fromString(str))).schema(projectIdSchema)

    implicit lazy val projectIdPlayFormat: Format[ProjectId] =
      new Format[ProjectId] {
        override def reads(json: PlayJsValue): JsResult[ProjectId] =
          uuidPlayFormat.reads(json).map(ProjectId.apply)

        override def writes(o: ProjectId): PlayJsValue = uuidPlayFormat.writes(o)
      }
  }

  object AchievementConfigurationRulePublicId {
    def apply(id: UUID): AchievementConfigurationRulePublicId = id.taggedWith[AchievementConfigurationRulePublicIdTag]

    def random(): AchievementConfigurationRulePublicId = AchievementConfigurationRulePublicId(UUID.randomUUID())

    implicit lazy val achievementConfigurationRulePublicIdSchema: Schema[AchievementConfigurationRulePublicId] =
      Schema[AchievementConfigurationRulePublicId](SString()).format("uuid")

    implicit lazy val achievementConfigurationRulePublicIdFormat: RootJsonFormat[AchievementConfigurationRulePublicId] =
      new RootJsonFormat[AchievementConfigurationRulePublicId] {
        override def read(value: JsValue): AchievementConfigurationRulePublicId = AchievementConfigurationRulePublicId(
          uuidFormat.read(value))

        override def write(id: AchievementConfigurationRulePublicId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val achievementConfigurationRulePublicIdCodec
        : Codec[String, AchievementConfigurationRulePublicId, TextPlain] =
      parsedString[AchievementConfigurationRulePublicId](str =>
        AchievementConfigurationRulePublicId(UUID.fromString(str))).schema(achievementConfigurationRulePublicIdSchema)

    implicit lazy val achievementConfigurationRulePublicIdPlayFormat: Format[AchievementConfigurationRulePublicId] =
      new Format[AchievementConfigurationRulePublicId] {
        override def reads(json: PlayJsValue): JsResult[AchievementConfigurationRulePublicId] =
          uuidPlayFormat.reads(json).map(AchievementConfigurationRulePublicId.apply)

        override def writes(o: AchievementConfigurationRulePublicId): PlayJsValue = uuidPlayFormat.writes(o)
      }
  }

  object EventConfigurationPublicId {
    def apply(id: UUID): EventConfigurationPublicId = id.taggedWith[EventConfigurationPublicIdTag]

    def random(): EventConfigurationPublicId = EventConfigurationPublicId(UUID.randomUUID())

    implicit lazy val eventConfigurationPublicIdSchema: Schema[EventConfigurationPublicId] =
      Schema[EventConfigurationPublicId](SString()).format("uuid")

    implicit lazy val eventConfigurationPublicIdFormat: RootJsonFormat[EventConfigurationPublicId] =
      new RootJsonFormat[EventConfigurationPublicId] {
        override def read(value: JsValue): EventConfigurationPublicId = EventConfigurationPublicId(
          uuidFormat.read(value))

        override def write(id: EventConfigurationPublicId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val eventConfigurationPublicIdCodec: Codec[String, EventConfigurationPublicId, TextPlain] =
      parsedString[EventConfigurationPublicId](str => EventConfigurationPublicId(UUID.fromString(str)))
        .schema(eventConfigurationPublicIdSchema)

    implicit lazy val eventConfigurationPublicIdPlayFormat: Format[EventConfigurationPublicId] =
      new Format[EventConfigurationPublicId] {
        override def reads(json: PlayJsValue): JsResult[EventConfigurationPublicId] =
          uuidPlayFormat.reads(json).map(EventConfigurationPublicId.apply)

        override def writes(o: EventConfigurationPublicId): PlayJsValue = uuidPlayFormat.writes(o)
      }
  }

  object AchievementEventId {
    def apply(id: Long): AchievementEventId = id.taggedWith[AchievementEventIdTag]
  }

  object AchievementEventDetailsId {
    def apply(id: Long): AchievementEventDetailsId = id.taggedWith[AchievementEventDetailsIdTag]
  }

  object AchievementEventDetailsFieldId {
    def apply(id: Long): AchievementEventDetailsFieldId = id.taggedWith[AchievementEventDetailsFieldIdTag]
  }

  object AchievementWebhookDetailsId {
    def apply(id: Long): AchievementWebhookDetailsId = id.taggedWith[AchievementWebhookDetailsIdTag]
  }

  object AchievementWebhookDetailsFieldId {
    def apply(id: Long): AchievementWebhookDetailsFieldId = id.taggedWith[AchievementWebhookDetailsFieldIdTag]
  }
}
