package stella.rules.db.achievement

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.models.Ids._

import stella.rules.models.Ids._
import stella.rules.models.Ids._
import stella.rules.models.achievement.AchievementConfigurationEntity
import stella.rules.models.achievement.AchievementTriggerBehaviour
import stella.rules.models.achievement.http.AchievementCondition
import stella.rules.models.achievement.http.AchievementEventActionPayload
import stella.rules.models.achievement.http.CreateAchievementWebhookActionDetails

trait AchievementConfigurationRepository {

  def getAchievementConfiguration(ruleId: AchievementConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[AchievementConfigurationEntity]]

  def getAchievementConfigurations(projectId: ProjectId, includeInactive: Boolean)(implicit
      ec: ExecutionContext): Future[Seq[AchievementConfigurationEntity]]

  def checkIfAchievementRuleConfigurationExists(ruleName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Boolean]

  def createAchievementConfigurationWithEvent(
      projectId: ProjectId,
      ruleId: AchievementConfigurationRuleId,
      eventConfigurationId: EventConfigurationId,
      aggregationIdMap: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
      achievementName: String,
      description: String,
      triggerBehaviour: AchievementTriggerBehaviour,
      actionPayload: AchievementEventActionPayload,
      conditions: List[AchievementCondition])(implicit ec: ExecutionContext): Future[AchievementConfigurationEntity]

  def createAchievementConfigurationWithWebhook(
      projectId: ProjectId,
      ruleId: AchievementConfigurationRuleId,
      aggregationIdMap: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
      achievementName: String,
      description: String,
      triggerBehaviour: AchievementTriggerBehaviour,
      actionDetails: CreateAchievementWebhookActionDetails,
      conditions: List[AchievementCondition])(implicit ec: ExecutionContext): Future[AchievementConfigurationEntity]

  def updateAchievementRuleConfiguration(
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId,
      newIsActiveValue: Boolean,
      newDescription: String): Future[Int]

  def delete(
      id: AchievementConfigurationId,
      eventId: Option[AchievementEventConfigurationId],
      webhookId: Option[AchievementWebhookConfigurationId])(implicit ec: ExecutionContext): Future[Unit]

  def isEventInUse(eventConfigurationId: EventConfigurationId)(implicit ec: ExecutionContext): Future[Boolean]

  def isAggregationRuleInUse(aggregationRuleConfigurationId: AggregationRuleConfigurationId)(implicit
      ec: ExecutionContext): Future[Boolean]
}
