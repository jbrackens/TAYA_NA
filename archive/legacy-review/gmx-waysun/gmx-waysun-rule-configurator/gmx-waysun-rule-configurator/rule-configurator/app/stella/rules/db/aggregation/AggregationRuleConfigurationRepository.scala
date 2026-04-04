package stella.rules.db.aggregation

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AggregationRuleConfigurationId
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.EventConfigurationId
import stella.rules.models.aggregation.AggregationRuleConfigurationEntity
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest

trait AggregationRuleConfigurationRepository {

  def getAggregationRuleConfigurations(projectId: ProjectId, includeInactive: Boolean)(implicit
      ec: ExecutionContext): Future[Seq[AggregationRuleConfigurationEntity]]

  def createAggregationRuleConfiguration(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId,
      eventId: EventConfigurationId,
      request: CreateAggregationRuleConfigurationRequest)(implicit
      ec: ExecutionContext): Future[AggregationRuleConfigurationEntity]

  def getAggregationRuleConfiguration(ruleId: AggregationRuleConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[AggregationRuleConfigurationEntity]]

  def getAggregationRuleConfigurationIds(ruleIds: List[AggregationRuleConfigurationRuleId], projectId: ProjectId)(
      implicit ec: ExecutionContext): Future[Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId]]

  def checkIfAggregationRuleConfigurationExists(ruleName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Boolean]

  def updateAggregationRuleConfiguration(
      ruleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId,
      newIsActiveValue: Boolean,
      newDescription: String): Future[Int]

  def delete(configurationId: AggregationRuleConfigurationId)(implicit ec: ExecutionContext): Future[Unit]

  def isEventInUse(eventConfigurationId: EventConfigurationId)(implicit ec: ExecutionContext): Future[Boolean]
}
