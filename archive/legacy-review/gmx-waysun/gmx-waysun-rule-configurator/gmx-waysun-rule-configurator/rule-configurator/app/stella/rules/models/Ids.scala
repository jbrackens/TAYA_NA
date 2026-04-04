package stella.rules.models

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

import stella.rules.routes.ResponseFormats.uuidPlayFormat

object Ids {

  trait AggregationRuleConditionIdTag
  trait AggregationRuleConfigurationIdTag
  trait AggregationRuleConfigurationRuleIdTag

  trait EventConfigurationIdTag
  trait EventConfigurationEventIdTag
  trait EventFieldIdTag

  trait AchievementConfigurationIdTag
  trait AchievementConfigurationRuleIdTag
  trait AchievementEventConfigurationIdTag
  trait AchievementEventConfigurationFieldIdTag
  trait AchievementConditionIdTag
  trait AchievementWebhookConfigurationIdTag
  trait AchievementWebhookConfigurationFieldIdTag

  type AggregationRuleConditionId = Long @@ AggregationRuleConditionIdTag
  type AggregationRuleConfigurationId = Long @@ AggregationRuleConfigurationIdTag
  type AggregationRuleConfigurationRuleId = UUID @@ AggregationRuleConfigurationRuleIdTag

  type EventConfigurationId = Long @@ EventConfigurationIdTag
  type EventConfigurationEventId = UUID @@ EventConfigurationEventIdTag
  type EventFieldId = Long @@ EventFieldIdTag

  type AchievementConfigurationId = Long @@ AchievementConfigurationIdTag
  type AchievementConfigurationRuleId = UUID @@ AchievementConfigurationRuleIdTag
  type AchievementEventConfigurationId = Long @@ AchievementEventConfigurationIdTag
  type AchievementEventConfigurationFieldId = Long @@ AchievementEventConfigurationFieldIdTag
  type AchievementConditionId = Long @@ AchievementConditionIdTag
  type AchievementWebhookConfigurationId = Long @@ AchievementWebhookConfigurationIdTag
  type AchievementWebhookConfigurationFieldId = Long @@ AchievementWebhookConfigurationFieldIdTag

  object AggregationRuleConditionId {
    def apply(id: Long): AggregationRuleConditionId = id.taggedWith[AggregationRuleConditionIdTag]
  }

  object AggregationRuleConfigurationId {
    def apply(id: Long): AggregationRuleConfigurationId = id.taggedWith[AggregationRuleConfigurationIdTag]
  }

  object AggregationRuleConfigurationRuleId {
    val dummyId: AggregationRuleConfigurationRuleId = AggregationRuleConfigurationRuleId(
      UUID.fromString("00000000-0000-0000-0000-000000000000"))

    implicit lazy val aggregationRuleConfigurationRuleIdFormat: RootJsonFormat[AggregationRuleConfigurationRuleId] =
      new RootJsonFormat[AggregationRuleConfigurationRuleId] {
        override def read(value: JsValue): AggregationRuleConfigurationRuleId = AggregationRuleConfigurationRuleId(
          uuidFormat.read(value))

        override def write(id: AggregationRuleConfigurationRuleId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val aggregationRuleConfigurationRuleIdSchema: Schema[AggregationRuleConfigurationRuleId] =
      Schema[AggregationRuleConfigurationRuleId](SString()).format("uuid")

    implicit lazy val aggregationRuleConfigurationRuleIdCodec
        : Codec[String, AggregationRuleConfigurationRuleId, TextPlain] =
      parsedString[AggregationRuleConfigurationRuleId](str => AggregationRuleConfigurationRuleId(UUID.fromString(str)))
        .schema(aggregationRuleConfigurationRuleIdSchema)

    implicit lazy val aggregationRuleConfigurationRuleIdPlayFormat: Format[AggregationRuleConfigurationRuleId] =
      new Format[AggregationRuleConfigurationRuleId] {
        override def reads(json: PlayJsValue): JsResult[AggregationRuleConfigurationRuleId] =
          uuidPlayFormat.reads(json).map(AggregationRuleConfigurationRuleId.apply)

        override def writes(o: AggregationRuleConfigurationRuleId): PlayJsValue = uuidPlayFormat.writes(o)
      }

    def apply(id: UUID): AggregationRuleConfigurationRuleId = id.taggedWith[AggregationRuleConfigurationRuleIdTag]

    def random(): AggregationRuleConfigurationRuleId = AggregationRuleConfigurationRuleId(UUID.randomUUID())
  }

  object ProjectIdInstances {
    implicit lazy val projectIdSchema: Schema[ProjectId] =
      Schema[ProjectId](SString()).format("uuid")

    implicit lazy val projectIdCodec: Codec[String, ProjectId, TextPlain] =
      parsedString[ProjectId](str => ProjectId(UUID.fromString(str))).schema(projectIdSchema)
  }

  object EventConfigurationId {
    def apply(id: Long): EventConfigurationId = id.taggedWith[EventConfigurationIdTag]
  }

  object EventConfigurationEventId {
    val dummyId: EventConfigurationEventId = EventConfigurationEventId(
      UUID.fromString("00000000-0000-0000-0000-000000000000"))

    implicit lazy val eventConfigurationEventIdFormat: RootJsonFormat[EventConfigurationEventId] =
      new RootJsonFormat[EventConfigurationEventId] {
        override def read(value: JsValue): EventConfigurationEventId = EventConfigurationEventId(uuidFormat.read(value))

        override def write(id: EventConfigurationEventId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val eventConfigurationEventIdSchema: Schema[EventConfigurationEventId] =
      Schema[EventConfigurationEventId](SString()).format("uuid")

    implicit lazy val eventConfigurationEventIdCodec: Codec[String, EventConfigurationEventId, TextPlain] =
      parsedString[EventConfigurationEventId](str => EventConfigurationEventId(UUID.fromString(str)))
        .schema(eventConfigurationEventIdSchema)

    implicit lazy val eventConfigurationEventIdPlayFormat: Format[EventConfigurationEventId] =
      new Format[EventConfigurationEventId] {
        override def reads(json: PlayJsValue): JsResult[EventConfigurationEventId] =
          uuidPlayFormat.reads(json).map(EventConfigurationEventId.apply)

        override def writes(o: EventConfigurationEventId): PlayJsValue = uuidPlayFormat.writes(o)
      }

    def apply(id: UUID): EventConfigurationEventId = id.taggedWith[EventConfigurationEventIdTag]

    def random(): EventConfigurationEventId = EventConfigurationEventId(UUID.randomUUID())
  }

  object EventFieldId {
    def apply(id: Long): EventFieldId = id.taggedWith[EventFieldIdTag]
  }

  object AchievementConfigurationId {
    def apply(id: Long): AchievementConfigurationId = id.taggedWith[AchievementConfigurationIdTag]
  }

  object AchievementConfigurationRuleId {
    implicit lazy val achievementConfigurationRuleIdFormat: RootJsonFormat[AchievementConfigurationRuleId] =
      new RootJsonFormat[AchievementConfigurationRuleId] {
        override def read(value: JsValue): AchievementConfigurationRuleId = AchievementConfigurationRuleId(
          uuidFormat.read(value))

        override def write(id: AchievementConfigurationRuleId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val achievementConfigurationRuleIdSchema: Schema[AchievementConfigurationRuleId] =
      Schema[AchievementConfigurationRuleId](SString()).format("uuid")

    implicit lazy val achievementConfigurationRuleIdCodec: Codec[String, AchievementConfigurationRuleId, TextPlain] =
      parsedString[AchievementConfigurationRuleId](str => AchievementConfigurationRuleId(UUID.fromString(str)))
        .schema(achievementConfigurationRuleIdSchema)

    def apply(id: UUID): AchievementConfigurationRuleId = id.taggedWith[AchievementConfigurationRuleIdTag]

    def random(): AchievementConfigurationRuleId = AchievementConfigurationRuleId(UUID.randomUUID())
  }

  object AchievementEventConfigurationId {
    def apply(id: Long): AchievementEventConfigurationId = id.taggedWith[AchievementEventConfigurationIdTag]
  }

  object AchievementEventConfigurationFieldId {
    def apply(id: Long): AchievementEventConfigurationFieldId = id.taggedWith[AchievementEventConfigurationFieldIdTag]
  }

  object AchievementConditionId {
    def apply(id: Long): AchievementConditionId = id.taggedWith[AchievementConditionIdTag]
  }

  object AchievementWebhookConfigurationId {
    def apply(id: Long): AchievementWebhookConfigurationId = id.taggedWith[AchievementWebhookConfigurationIdTag]
  }

  object AchievementWebhookConfigurationFieldId {
    def apply(id: Long): AchievementWebhookConfigurationFieldId =
      id.taggedWith[AchievementWebhookConfigurationFieldIdTag]
  }
}
