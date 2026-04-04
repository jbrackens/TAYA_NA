package stella.rules.models.achievement

import java.time.OffsetDateTime

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.LowerCamelcase
import enumeratum.PlayJsonEnum
import pl.iterators.kebs.json.KebsEnumFormats.jsonEnumFormat
import spray.json.JsonFormat
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import stella.common.models.Ids._
import stella.dataapi.{achievement => dataapi}

import stella.rules.models.Ids._
import stella.rules.models.achievement.RequestType.Delete
import stella.rules.models.achievement.RequestType.Get
import stella.rules.models.achievement.RequestType.Patch
import stella.rules.models.achievement.RequestType.Post
import stella.rules.models.achievement.RequestType.Put
import stella.rules.models.achievement.http.AchievementAction
import stella.rules.models.achievement.http.AchievementCondition
import stella.rules.models.achievement.http.AchievementEventActionPayload
import stella.rules.models.achievement.http.AchievementRuleConfiguration
import stella.rules.models.achievement.http.AchievementWebhookActionPayload
import stella.rules.models.achievement.http.EventActionField
import stella.rules.models.achievement.http.WebhookActionEventConfig
import stella.rules.models.achievement.http.WebhookActionField
import stella.rules.models.aggregation.AggregationConditionType

final case class AchievementConfigurationEntity(
    id: AchievementConfigurationId,
    ruleId: AchievementConfigurationRuleId,
    projectId: ProjectId,
    name: String,
    description: String,
    triggerBehaviour: AchievementTriggerBehaviour,
    actionType: ActionType,
    achievementEventConfigurationId: Option[AchievementEventConfigurationId],
    achievementEventConfiguration: Option[AchievementEventConfigurationEntity],
    achievementWebhookConfigurationId: Option[AchievementWebhookConfigurationId],
    achievementWebhookConfiguration: Option[AchievementWebhookConfigurationEntity],
    conditions: List[AchievementConditionEntity],
    isActive: Boolean,
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toAchievementRuleConfiguration: AchievementRuleConfiguration =
    http.AchievementRuleConfiguration(
      achievementRuleId = ruleId,
      achievementName = name,
      description = description,
      triggerBehaviour = triggerBehaviour,
      action = action,
      conditions = conditions.map(_.toAchievementCondition),
      isActive = isActive,
      createdAt = createdAt,
      updatedAt = updatedAt)

  private def action: AchievementAction = {
    val payload = (achievementEventConfiguration, achievementWebhookConfiguration) match {
      case (Some(eventActionConfiguration), None) =>
        AchievementEventActionPayload(
          eventId = eventActionConfiguration.eventConfigurationEventId,
          setFields = eventActionConfiguration.fields.map(_.toEventActionField))
      case (None, Some(webhookActionConfiguration)) =>
        AchievementWebhookActionPayload(
          requestType = webhookActionConfiguration.requestType,
          targetUrl = webhookActionConfiguration.url,
          eventConfig = webhookActionConfiguration.eventConfigurationEventId.map(id =>
            WebhookActionEventConfig(
              eventId = id,
              setFields = webhookActionConfiguration.fields.map(_.toWebhookActionField))))
      case (None, None) => // it shouldn't happen
        throw new RuntimeException(
          s"Action configuration is missing for achievement configuration with rule id $ruleId for project $projectId")
      case _ => // it shouldn't happen
        throw new RuntimeException(
          s"Achievement configuration with rule id $ruleId for project $projectId has specified more than one action")
    }
    http.AchievementAction(payload.actionType, payload)
  }
}

sealed trait AchievementTriggerBehaviour extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum {
  def toDataApi: dataapi.AchievementTriggerBehaviour
}

object AchievementTriggerBehaviour
    extends Enum[AchievementTriggerBehaviour]
    with PlayJsonEnum[AchievementTriggerBehaviour] {
  override def values: IndexedSeq[AchievementTriggerBehaviour] = findValues

  case object Always extends AchievementTriggerBehaviour {
    override def toDataApi: dataapi.AchievementTriggerBehaviour = dataapi.AchievementTriggerBehaviour.ALWAYS
  }

  case object OnlyOnce extends AchievementTriggerBehaviour {
    override def toDataApi: dataapi.AchievementTriggerBehaviour = dataapi.AchievementTriggerBehaviour.ONLY_ONCE
  }

  implicit lazy val achievementTriggerBehaviourFormat: JsonFormat[AchievementTriggerBehaviour] = jsonEnumFormat
}

sealed trait ActionType extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum {
  def toDataApi: dataapi.ActionType
}

object ActionType extends Enum[ActionType] with PlayJsonEnum[ActionType] {

  override def values: IndexedSeq[ActionType] = findValues

  case object Event extends ActionType {
    override def toDataApi: dataapi.ActionType = dataapi.ActionType.EVENT
  }

  case object Webhook extends ActionType {
    override def toDataApi: dataapi.ActionType = dataapi.ActionType.WEBHOOK
  }

  implicit lazy val actionTypeFormat: JsonFormat[ActionType] = jsonEnumFormat
}

final case class AchievementConditionEntity(
    id: AchievementConditionId,
    achievementConfigurationId: AchievementConfigurationId,
    aggregationRuleConfigurationId: AggregationRuleConfigurationId,
    aggregationRuleConfigurationRuleId: AggregationRuleConfigurationRuleId,
    aggregationField: String,
    conditionType: AggregationConditionType,
    value: Option[String],
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {
  def toAchievementCondition: AchievementCondition =
    http.AchievementCondition(
      aggregationRuleId = aggregationRuleConfigurationRuleId,
      aggregationField = aggregationField,
      conditionType = conditionType,
      value = value)
}

final case class AchievementEventConfigurationEntity(
    id: AchievementEventConfigurationId,
    eventConfigurationId: EventConfigurationId,
    eventConfigurationEventId: EventConfigurationEventId,
    fields: List[AchievementEventConfigurationFieldEntity],
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime)

final case class AchievementEventConfigurationFieldEntity(
    id: AchievementEventConfigurationFieldId,
    achievementEventConfigurationId: AchievementEventConfigurationId,
    fieldName: String,
    operationType: OperationType,
    aggregationRuleId: Option[AggregationRuleConfigurationRuleId],
    value: String,
    createAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toEventActionField: EventActionField =
    http.EventActionField(
      fieldName = fieldName,
      operation = operationType,
      aggregationRuleId = aggregationRuleId,
      value = value)
}

final case class AchievementWebhookConfigurationEntity(
    id: AchievementWebhookConfigurationId,
    eventConfigurationId: Option[EventConfigurationId],
    eventConfigurationEventId: Option[EventConfigurationEventId],
    requestType: RequestType,
    url: String,
    fields: List[AchievementWebhookConfigurationFieldEntity],
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime)

final case class AchievementWebhookConfigurationFieldEntity(
    id: AchievementWebhookConfigurationFieldId,
    achievementWebhookConfigurationId: AchievementWebhookConfigurationId,
    fieldName: String,
    operationType: OperationType,
    aggregationRuleId: Option[AggregationRuleConfigurationRuleId],
    value: String,
    createAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toWebhookActionField: WebhookActionField =
    http.WebhookActionField(
      fieldName = fieldName,
      operation = operationType,
      aggregationRuleId = aggregationRuleId,
      value = value)
}

sealed trait OperationType extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum {
  final def toDataApi: dataapi.OperationType = this match {
    case OperationType.ReplaceFrom => dataapi.OperationType.REPLACE_FROM
    case OperationType.Static      => dataapi.OperationType.STATIC
  }
}

object OperationType extends Enum[OperationType] with PlayJsonEnum[OperationType] {

  override def values: IndexedSeq[OperationType] = findValues

  case object ReplaceFrom extends OperationType
  case object Static extends OperationType

  implicit lazy val operationTypeFormat: JsonFormat[OperationType] = jsonEnumFormat
}

sealed trait RequestType extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum {
  final def toDataApiRequestType: dataapi.RequestType = this match {
    case Get    => dataapi.RequestType.GET
    case Post   => dataapi.RequestType.POST
    case Put    => dataapi.RequestType.PUT
    case Patch  => dataapi.RequestType.PATCH
    case Delete => dataapi.RequestType.DELETE
  }
}

object RequestType extends Enum[RequestType] with PlayJsonEnum[RequestType] {

  override def values: IndexedSeq[RequestType] = findValues

  case object Get extends RequestType
  case object Post extends RequestType
  case object Put extends RequestType
  case object Patch extends RequestType
  case object Delete extends RequestType

  implicit lazy val requestTypeFormat: JsonFormat[RequestType] = jsonEnumFormat
}
