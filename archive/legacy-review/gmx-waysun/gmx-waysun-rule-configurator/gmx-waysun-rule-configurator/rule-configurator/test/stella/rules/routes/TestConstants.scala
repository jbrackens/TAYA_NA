package stella.rules.routes

import java.util.UUID

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.EventConfigurationEventId

object TestConstants {
  object Endpoint {
    val eventsEndpointPath = "/rule_configurator/events"
    val aggregationRulesEndpointPath = s"/rule_configurator/aggregations"
    val achievementRulesEndpointPath = "/rule_configurator/achievements"
    val includeInactiveQueryParam = "include_inactive"

    def aggregationRuleEndpointPath(ruleId: UUID) =
      s"$aggregationRulesEndpointPath/$ruleId"

    def aggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive: Boolean): String =
      s"$aggregationRulesEndpointPath?$includeInactiveQueryParam=$includeInactive"

    def aggregationAdminRulesEndpointPath(projectId: UUID) = s"/rule_configurator/admin/$projectId/aggregations"

    def aggregationAdminRuleEndpointPath(projectId: UUID, ruleId: UUID) =
      s"${aggregationAdminRulesEndpointPath(projectId)}/$ruleId"

    def aggregationAdminRulesEndpointPathWithIncludeInactiveParam(includeInactive: Boolean, projectId: UUID): String =
      s"${aggregationAdminRulesEndpointPath(projectId)}?$includeInactiveQueryParam=$includeInactive"

    def eventEndpointPath(eventId: EventConfigurationEventId) = s"$eventsEndpointPath/$eventId"

    def eventsEndpointPathWithIncludeInactiveParam(includeInactive: Boolean): String =
      s"$eventsEndpointPath?$includeInactiveQueryParam=$includeInactive"

    def eventAdminEndpointPath(projectId: ProjectId, eventId: EventConfigurationEventId) =
      s"${eventsAdminEndpointPath(projectId)}/$eventId"

    def eventsAdminEndpointPath(projectId: ProjectId): String = s"/rule_configurator/admin/$projectId/events"

    def eventsAdminEndpointPathWithIncludeInactiveParam(projectId: ProjectId, includeInactive: Boolean): String =
      s"${eventsAdminEndpointPath(projectId)}?$includeInactiveQueryParam=$includeInactive"

    def achievementRuleEndpointPath(ruleId: UUID) = s"$achievementRulesEndpointPath/$ruleId"

    def achievementRulesEndpointPathWithIncludeInactiveParam(includeInactive: Boolean): String =
      s"$achievementRulesEndpointPath?$includeInactiveQueryParam=$includeInactive"

    def achievementAdminRulesEndpointPath(projectId: UUID) = s"/rule_configurator/admin/$projectId/achievements"

    def achievementAdminRuleEndpointPath(projectId: UUID, ruleId: UUID) =
      s"${achievementAdminRulesEndpointPath(projectId)}/$ruleId"

    def achievementAdminRulesEndpointPathWithIncludeInactiveParam(includeInactive: Boolean, projectId: UUID): String =
      s"${achievementAdminRulesEndpointPath(projectId)}?$includeInactiveQueryParam=$includeInactive"

  }

  object JsonFieldName {
    val achievementEventPayloadFieldName = "fieldName"
    val achievementEventPayloadFields = "action.payload.setFields"
    val achievementOperationType = "operation"
    val achievementRuleConfigName = "achievementName"
    val achievementAggregationRuleId = "aggregationRuleId"
    val achievementAggregationField = "aggregationField"
    val achievementConditionType = "conditionType"
    val aggregationRuleConditionFieldName = "eventFieldName"
    val aggregationConditions = "aggregationConditions"
    val aggregationRuleConfigName = "name"
    val aggregationFieldName = "aggregationFieldName"
    val aggregationGroupByFieldName = "aggregationGroupByFieldName"
    val conditionType = "conditionType"
    val eventConfigName = "name"
    val eventFieldName = "name"
    val fields = "fields"
    val resetFrequency = "resetFrequency"
    val resetFrequencyInterval = "interval"
    val resetFrequencyLength = "length"
    val resetFrequencyIntervalDetails = "intervalDetails"
    val windowStartDateUTC = "windowStartDateUTC"
    val windowCountLimit = "windowCountLimit"
    val value = "value"
    val valueType = "valueType"
  }

  val maxAggregationRuleConditionValueLength = 250
  val maxAggregationRuleConfigNameLength = 50
  val maxEventConfigNameLength = 50
  val maxEventFieldNameLength = 250
  val maxAchievementConfigNameLength = 250
  val maxAchievementValueLength = 250
  val maxAchievementWebhookActionTargetUrlLength = 250
  val okStatus = "ok"
}
