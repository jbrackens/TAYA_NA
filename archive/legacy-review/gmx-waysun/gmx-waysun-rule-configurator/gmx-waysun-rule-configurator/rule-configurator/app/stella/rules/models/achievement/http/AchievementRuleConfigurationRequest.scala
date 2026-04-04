package stella.rules.models.achievement.http

import java.time.OffsetDateTime

import scala.jdk.CollectionConverters._

import play.api.libs.json._
import spray.json.DefaultJsonProtocol._
import spray.json.JsObject
import spray.json.JsValue
import spray.json.RootJsonFormat
import spray.json.enrichAny
import sttp.tapir.Schema

import stella.common.http.json.JsonFormats.offsetDateTimeFormat
import stella.common.models.Ids._
import stella.dataapi.achievement.WebhookEventConfiguration
import stella.dataapi.{achievement => dataapi}

import stella.rules.models.ConstructorRequirementsUtils.requireNonEmptyAndNonBlankWithLengthLimit
import stella.rules.models.Ids.AchievementConfigurationRuleId._
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId._
import stella.rules.models.Ids.EventConfigurationEventId._
import stella.rules.models.Ids._
import stella.rules.models.achievement.AchievementConfigurationEntity
import stella.rules.models.achievement.AchievementTriggerBehaviour
import stella.rules.models.achievement.ActionType
import stella.rules.models.achievement.OperationType
import stella.rules.models.achievement.RequestType
import stella.rules.models.achievement.http.AchievementAction._
import stella.rules.models.achievement.http.AchievementCondition.aggregationValueMaxLength
import stella.rules.models.achievement.http.AchievementWebhookActionPayload.urlRegex
import stella.rules.models.achievement.http.AchievementWebhookActionPayload.webhookActionTargetUrlMaxLength
import stella.rules.models.achievement.http.CreateAchievementRuleConfigurationRequest.maxNameLength
import stella.rules.models.aggregation.AggregationConditionType
import stella.rules.models.event.http.EventField
import stella.rules.models.event.http.EventField.eventFieldDescription

final case class AchievementAction(actionType: ActionType, payload: AchievementActionPayload) {
  require(actionType == payload.actionType, "actionType and payload should match")
}

object AchievementAction {

  implicit lazy val achievementActionFormat: RootJsonFormat[AchievementAction] = jsonFormat2(AchievementAction.apply)

  implicit lazy val achievementActionPlayFormat: OFormat[AchievementAction] = Json.format[AchievementAction]

  implicit lazy val achievementActionSchema: Schema[AchievementAction] = Schema.derived[AchievementAction]

  def apply(payload: AchievementEventActionPayload): AchievementAction = AchievementAction(ActionType.Event, payload)

  def apply(payload: AchievementWebhookActionPayload): AchievementAction =
    AchievementAction(ActionType.Webhook, payload)
}

sealed trait AchievementActionPayload {
  def actionType: ActionType
}

object AchievementActionPayload {
  private val eventIdField = "eventId"
  private val setFieldsField = "setFields"

  implicit lazy val achievementActionPayloadFormat: RootJsonFormat[AchievementActionPayload] =
    new RootJsonFormat[AchievementActionPayload] {
      override def write(obj: AchievementActionPayload): JsValue = obj match {
        case p: AchievementEventActionPayload   => p.toJson
        case p: AchievementWebhookActionPayload => p.toJson
      }

      override def read(json: JsValue): AchievementActionPayload = json match {
        case obj: JsObject if containsAchievementEventActionPayloadFields(obj) =>
          json.convertTo[AchievementEventActionPayload]
        case _ => json.convertTo[AchievementWebhookActionPayload]
      }

      private def containsAchievementEventActionPayloadFields(obj: JsObject): Boolean = {
        val fieldNames = obj.fields.toList.map(_._1)
        List(eventIdField, setFieldsField).forall(fieldNames.contains)
      }
    }

  implicit lazy val achievementActionPayloadPlayFormat: OFormat[AchievementActionPayload] =
    Json.format[AchievementActionPayload]

  implicit lazy val achievementActionPayloadSchema: Schema[AchievementActionPayload] =
    Schema.derived[AchievementActionPayload]
}

final case class AchievementEventActionPayload(eventId: EventConfigurationEventId, setFields: List[EventActionField])
    extends AchievementActionPayload {
  override def actionType: ActionType = ActionType.Event
}

object AchievementEventActionPayload {
  implicit lazy val achievementEventActionPayloadFormat: RootJsonFormat[AchievementEventActionPayload] = jsonFormat2(
    AchievementEventActionPayload.apply)

  implicit lazy val achievementEventActionPayloadPlayFormat: OFormat[AchievementEventActionPayload] =
    Json.format[AchievementEventActionPayload]

  implicit lazy val achievementEventActionPayloadSchema: Schema[AchievementEventActionPayload] =
    Schema.derived[AchievementEventActionPayload]
}

final case class EventActionField(
    fieldName: String,
    operation: OperationType,
    aggregationRuleId: Option[AggregationRuleConfigurationRuleId],
    value: String) {
  EventField.validateEventField("Event action field name", fieldName)
  requireNonEmptyAndNonBlankWithLengthLimit(
    "Event action field value",
    value,
    EventActionField.eventActionFieldValueMaxLength)
  require(
    (operation == OperationType.Static && aggregationRuleId.isEmpty) ||
    (operation == OperationType.ReplaceFrom && aggregationRuleId.nonEmpty),
    s"aggregationRuleId should be empty for ${OperationType.Static.entryName} and non-empty otherwise")

  def toDataApiEventFieldConfiguration: dataapi.EventFieldConfiguration =
    dataapi.EventFieldConfiguration
      .newBuilder()
      .setFieldName(fieldName)
      .setOperationType(operation.toDataApi)
      .setAggregationRuleId(aggregationRuleId.map(_.toString).orNull)
      .setValue(value)
      .build()
}

object EventActionField {
  val eventActionFieldValueMaxLength = 250

  implicit lazy val eventActionFieldFormat: RootJsonFormat[EventActionField] = jsonFormat4(EventActionField.apply)
  implicit lazy val eventActionFieldPlayFormat: OFormat[EventActionField] = Json.format[EventActionField]
  implicit lazy val eventActionFieldSchema: Schema[EventActionField] = Schema
    .derived[EventActionField]
    .modify(_.fieldName)(_.description(eventFieldDescription).encodedExample("hidden_chests_found"))
}

final case class AchievementWebhookActionPayload(
    requestType: RequestType,
    targetUrl: String,
    eventConfig: Option[WebhookActionEventConfig])
    extends AchievementActionPayload {
  requireNonEmptyAndNonBlankWithLengthLimit("Webhook action target URL", targetUrl, webhookActionTargetUrlMaxLength)
  require(urlRegex.matches(targetUrl), s"Webhook action target URL '$targetUrl' is not a proper HTTP(S) URL")

  override def actionType: ActionType = ActionType.Webhook
}

object AchievementWebhookActionPayload {
  val webhookActionTargetUrlMaxLength = 250
  private[http] val urlRegex = """^(http(s)?:\/\/)?[\w.-]+(\.[\w\.-]+)+[\w\-\._~:/#\[\]?@!\*\+&,;=.]+$""".r

  implicit lazy val achievementWebhookActionPayloadFormat: RootJsonFormat[AchievementWebhookActionPayload] =
    jsonFormat3(AchievementWebhookActionPayload.apply)

  implicit lazy val achievementWebhookActionPayloadPlayFormat: OFormat[AchievementWebhookActionPayload] =
    Json.format[AchievementWebhookActionPayload]

  implicit lazy val achievementWebhookActionPayloadSchema: Schema[AchievementWebhookActionPayload] =
    Schema
      .derived[AchievementWebhookActionPayload]
      .modify(_.targetUrl)(
        _.description(s"""Url matching regex ${urlRegex.regex} not longer than $webhookActionTargetUrlMaxLength""")
          .encodedExample("https://mypage.com/myendpoint"))
}

final case class CreateAchievementWebhookActionDetails(
    requestType: RequestType,
    targetUrl: String,
    eventConfig: Option[CreateWebhookActionEventConfig])

final case class WebhookActionEventConfig(eventId: EventConfigurationEventId, setFields: List[WebhookActionField])

object WebhookActionEventConfig {
  implicit lazy val webhookActionEventConfigFormat: RootJsonFormat[WebhookActionEventConfig] =
    jsonFormat2(WebhookActionEventConfig.apply)

  implicit lazy val webhookActionEventConfigPlayFormat: OFormat[WebhookActionEventConfig] =
    Json.format[WebhookActionEventConfig]

  implicit lazy val webhookActionEventConfigSchema: Schema[WebhookActionEventConfig] =
    Schema.derived[WebhookActionEventConfig]
}

final case class CreateWebhookActionEventConfig(
    eventConfigDbId: EventConfigurationId,
    eventConfigId: EventConfigurationEventId,
    setFields: List[WebhookActionField])

final case class WebhookActionField(
    fieldName: String,
    operation: OperationType,
    aggregationRuleId: Option[AggregationRuleConfigurationRuleId],
    value: String) {
  EventField.validateEventField("Webhook action field name", fieldName)
  requireNonEmptyAndNonBlankWithLengthLimit(
    "Webhook action field value",
    value,
    WebhookActionField.webhookActionFieldValueMaxLength)
  require(
    (operation == OperationType.Static && aggregationRuleId.isEmpty) ||
    (operation == OperationType.ReplaceFrom && aggregationRuleId.nonEmpty),
    s"aggregationRuleId should be empty for ${OperationType.Static.entryName} and non-empty otherwise")

  def toDataApiEventFieldConfiguration: dataapi.EventFieldConfiguration =
    dataapi.EventFieldConfiguration
      .newBuilder()
      .setFieldName(fieldName)
      .setOperationType(operation.toDataApi)
      .setAggregationRuleId(aggregationRuleId.map(_.toString).orNull)
      .setValue(value)
      .build()
}

object WebhookActionField {
  val webhookActionFieldValueMaxLength = 250

  implicit lazy val eventActionFieldFormat: RootJsonFormat[WebhookActionField] = jsonFormat4(WebhookActionField.apply)
  implicit lazy val eventActionFieldPlayFormat: OFormat[WebhookActionField] = Json.format[WebhookActionField]
  implicit lazy val eventActionFieldSchema: Schema[WebhookActionField] = Schema
    .derived[WebhookActionField]
    .modify(_.fieldName)(_.description(eventFieldDescription).encodedExample("hidden_chests_found"))
}

final case class AchievementCondition(
    aggregationRuleId: AggregationRuleConfigurationRuleId,
    aggregationField: String,
    conditionType: AggregationConditionType,
    value: Option[String]) {
  EventField.validateEventField("Achievement condition aggregation field", aggregationField)
  require(
    conditionType != AggregationConditionType.Nn || value.isEmpty,
    s"A value for achievement condition ${conditionType.entryName} should be empty")
  require(
    conditionType == AggregationConditionType.Nn || value.exists(v =>
      !v.isBlank && v.length <= aggregationValueMaxLength),
    s"A value for achievement condition type ${conditionType.entryName} must be specified, non-blank and have at most $aggregationValueMaxLength characters")

  def toDataApi: dataapi.AchievementCondition =
    dataapi.AchievementCondition
      .newBuilder()
      .setAggregationRuleId(aggregationRuleId.toString)
      .setAggregationField(aggregationField)
      .setConditionType(dataapi.ConditionType.valueOf(conditionType.entryName))
      .setValue(value.orNull)
      .build()
}

object AchievementCondition {
  val aggregationValueMaxLength = 250

  implicit lazy val achievementConditionFormat: RootJsonFormat[AchievementCondition] = jsonFormat4(
    AchievementCondition.apply)

  implicit lazy val achievementConditionPlayFormat: OFormat[AchievementCondition] = Json.format[AchievementCondition]

  implicit lazy val achievementConditionSchema: Schema[AchievementCondition] =
    Schema.derived[AchievementCondition]
}

final case class CreateAchievementRuleConfigurationRequest(
    achievementName: String,
    description: String,
    triggerBehaviour: Option[AchievementTriggerBehaviour],
    action: AchievementAction,
    conditions: List[AchievementCondition]) {
  requireNonEmptyAndNonBlankWithLengthLimit("Achievement rule configuration name", achievementName, maxNameLength)
  require(conditions.nonEmpty, "It's required to specify at least one achievement condition")
  checkAggregationRuleIdsInFieldsExistInConditions()

  // only for test purposes
  def getConditionAggregationRuleIds: List[AggregationRuleConfigurationRuleId] = conditions.map(_.aggregationRuleId)

  private def checkAggregationRuleIdsInFieldsExistInConditions(): Unit = {
    val aggregationRuleIdsInFields: Seq[AggregationRuleConfigurationRuleId] = action.payload match {
      case payload: AchievementEventActionPayload => payload.setFields.flatMap(_.aggregationRuleId).distinct
      case payload: AchievementWebhookActionPayload =>
        payload.eventConfig.toList.flatMap(_.setFields.flatMap(_.aggregationRuleId)).distinct
    }
    if (aggregationRuleIdsInFields.nonEmpty) {
      val allowedAggregationRuleIds = conditions.map(_.aggregationRuleId).toSet
      val wrongIds = aggregationRuleIdsInFields.filterNot(allowedAggregationRuleIds)
      require(
        wrongIds.isEmpty,
        s"Action fields refer to aggregation rules not included in the conditions: ${wrongIds.mkString(", ")}")
    }
  }
}

object CreateAchievementRuleConfigurationRequest {
  private val maxNameLength = 250
  val defaultAchievementTriggerBehaviour: AchievementTriggerBehaviour = AchievementTriggerBehaviour.OnlyOnce

  implicit lazy val createAchievementRuleConfigurationRequestFormat
      : RootJsonFormat[CreateAchievementRuleConfigurationRequest] = jsonFormat5(
    CreateAchievementRuleConfigurationRequest.apply)

  implicit lazy val createAchievementRuleConfigurationRequestPlayFormat
      : OFormat[CreateAchievementRuleConfigurationRequest] =
    Json.format[CreateAchievementRuleConfigurationRequest]

  implicit lazy val createAchievementRuleConfigurationRequestSchema: Schema[CreateAchievementRuleConfigurationRequest] =
    Schema
      .derived[CreateAchievementRuleConfigurationRequest]
      .modify(_.triggerBehaviour)(
        _.description( // for some reason currently Tapir doesn't include this in docs even though it should
          "Whether an achievement should be triggerred only once after matching" +
          " the conditions or every time when there's a new event and the conditions are matched." +
          s"When not set, it defaults to: $defaultAchievementTriggerBehaviour")
          .encodedExample(defaultAchievementTriggerBehaviour.entryName))
      .modify(_.achievementName)(
        _.description(s"A non-empty, non-blank display name not longer than $maxNameLength characters"))
}

final case class UpdateAchievementRuleConfigurationRequest(isActive: Option[Boolean], description: Option[String]) {
  require(isActive.nonEmpty || description.nonEmpty, "No data to update specified")

  def containsChanges(entity: AchievementConfigurationEntity): Boolean =
    isActive.exists(_ != entity.isActive) || description.exists(_ != entity.description)
}

object UpdateAchievementRuleConfigurationRequest {
  implicit lazy val updateAchievementRuleConfigurationRequestFormat
      : RootJsonFormat[UpdateAchievementRuleConfigurationRequest] = jsonFormat2(
    UpdateAchievementRuleConfigurationRequest.apply)

  implicit lazy val updateAchievementRuleConfigurationRequestPlayFormat
      : OFormat[UpdateAchievementRuleConfigurationRequest] =
    Json.format[UpdateAchievementRuleConfigurationRequest]

  implicit lazy val updateAchievementRuleConfigurationRequestSchema: Schema[UpdateAchievementRuleConfigurationRequest] =
    Schema
      .derived[UpdateAchievementRuleConfigurationRequest]
      .modify(_.isActive)(_.description("New isActive value"))
      .modify(_.description)(_.description("New description value"))
}

final case class AchievementRuleConfiguration(
    achievementRuleId: AchievementConfigurationRuleId,
    achievementName: String,
    description: String,
    triggerBehaviour: AchievementTriggerBehaviour,
    action: AchievementAction,
    conditions: List[AchievementCondition],
    isActive: Boolean,
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toDataApiAchievementConfiguration: dataapi.AchievementConfiguration = {
    val builder = dataapi.AchievementConfiguration
      .newBuilder()
      .setName(achievementName)
      .setTriggerBehaviour(triggerBehaviour.toDataApi)
      .setConditions(conditions.map(_.toDataApi).asJava)
      .setActionType(action.actionType.toDataApi)

    action.payload match {
      case payload: AchievementEventActionPayload =>
        builder
          .setEventConfiguration(
            dataapi.EventConfiguration
              .newBuilder()
              .setEventId(payload.eventId.toString)
              .setFields(payload.setFields.map(_.toDataApiEventFieldConfiguration).asJava)
              .build())
          .setWebhookConfiguration(None.orNull)
      case payload: AchievementWebhookActionPayload =>
        val webhookConfigBuilder = dataapi.WebhookConfiguration
          .newBuilder()
          .setRequestType(payload.requestType.toDataApiRequestType)
          .setUrl(payload.targetUrl)
        val webhookEventConfigOpt = payload.eventConfig.map { eventConfig =>
          WebhookEventConfiguration
            .newBuilder()
            .setEventId(eventConfig.eventId.toString)
            .setFields(eventConfig.setFields.map(_.toDataApiEventFieldConfiguration).asJava)
            .build()
        }
        webhookConfigBuilder.setWebhookEventConfiguration(webhookEventConfigOpt.orNull)
        builder.setEventConfiguration(None.orNull).setWebhookConfiguration(webhookConfigBuilder.build())
    }
    builder.build()
  }

  // only for test purposes
  def getConditionAggregationRuleIds: List[AggregationRuleConfigurationRuleId] = conditions.map(_.aggregationRuleId)
}

object AchievementRuleConfiguration {
  implicit lazy val achievementRuleConfigurationFormat: RootJsonFormat[AchievementRuleConfiguration] = jsonFormat9(
    AchievementRuleConfiguration.apply)

  implicit lazy val achievementRuleConfigurationSchema: Schema[AchievementRuleConfiguration] =
    Schema.derived[AchievementRuleConfiguration]
}
