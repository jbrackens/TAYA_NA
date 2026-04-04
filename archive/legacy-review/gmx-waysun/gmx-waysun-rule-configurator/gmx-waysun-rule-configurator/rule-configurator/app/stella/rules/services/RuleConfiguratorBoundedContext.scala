package stella.rules.services

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import stella.common.http.jwt.Permission
import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.achievement.http.AchievementRuleConfiguration
import stella.rules.models.achievement.http.CreateAchievementRuleConfigurationRequest
import stella.rules.models.achievement.http.UpdateAchievementRuleConfigurationRequest
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.UpdateEventConfigurationRequest
import stella.rules.services.RuleConfiguratorBoundedContext._

trait RuleConfiguratorBoundedContext {

  def getEventConfigurations(includeInactive: Boolean, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[EventConfiguration]]

  def createEventConfiguration(request: CreateEventConfigurationRequest, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, CreateEventConfigurationError, EventConfiguration]

  def getEventConfiguration(eventId: EventConfigurationEventId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, GetEventConfigurationError, EventConfiguration]

  def updateEventConfiguration(
      eventId: EventConfigurationEventId,
      request: UpdateEventConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateEventConfigurationError, EventConfiguration]

  def deleteEventConfiguration(eventId: EventConfigurationEventId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteEventConfigurationError, Unit]

  def getAggregationRuleConfigurations(includeInactive: Boolean, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[AggregationRuleConfiguration]]

  def createAggregationRuleConfiguration(
      request: CreateAggregationRuleConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, CreateAggregationRuleConfigurationError, AggregationRuleConfiguration]

  def getAggregationRuleConfiguration(ruleId: AggregationRuleConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, GetAggregationRuleConfigurationError, AggregationRuleConfiguration]

  def updateAggregationRuleConfiguration(
      ruleId: AggregationRuleConfigurationRuleId,
      request: UpdateAggregationRuleConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateAggregationRuleConfigurationError, AggregationRuleConfiguration]

  def deleteAggregationRuleConfiguration(ruleId: AggregationRuleConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteAggregationRuleConfigurationError, Unit]

  def getAchievementRuleConfigurations(includeInactive: Boolean, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[AchievementRuleConfiguration]]

  def createAchievementRuleConfiguration(
      request: CreateAchievementRuleConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, CreateAchievementRuleConfigurationError, AchievementRuleConfiguration]

  def getAchievementRuleConfiguration(ruleId: AchievementConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, GetAchievementRuleConfigurationError, AchievementRuleConfiguration]

  def updateAchievementRuleConfiguration(
      ruleId: AchievementConfigurationRuleId,
      request: UpdateAchievementRuleConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateAchievementRuleConfigurationError, AchievementRuleConfiguration]

  def deleteAchievementRuleConfiguration(ruleId: AchievementConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteAchievementRuleConfigurationError, Unit]
}

object RuleConfiguratorBoundedContext {

  sealed trait UpdateEventConfigurationError
  sealed trait CreateEventConfigurationError
  sealed trait DeleteEventConfigurationError
  sealed trait GetEventConfigurationError

  sealed trait UpdateAggregationRuleConfigurationError
  sealed trait CreateAggregationRuleConfigurationError
  sealed trait DeleteAggregationRuleConfigurationError
  sealed trait GetAggregationRuleConfigurationError

  sealed trait CreateAchievementRuleConfigurationError
  sealed trait GetAchievementRuleConfigurationError
  sealed trait UpdateAchievementRuleConfigurationError
  sealed trait DeleteAchievementRuleConfigurationError

  final case class EventConfigurationIsActiveError(eventId: EventConfigurationEventId, projectId: ProjectId)
      extends DeleteEventConfigurationError {

    def errorMessage: String = s"Event configuration with id $eventId for project $projectId is active"
  }

  final case class EventConfigurationIsInUseError(eventId: EventConfigurationEventId, projectId: ProjectId)
      extends DeleteEventConfigurationError {

    def errorMessage: String = s"Event configuration with id $eventId for project $projectId is in use"
  }

  final case class EventConfigurationNotFoundError(eventId: EventConfigurationEventId, projectId: ProjectId)
      extends GetEventConfigurationError
      with UpdateEventConfigurationError
      with DeleteEventConfigurationError
      with CreateAggregationRuleConfigurationError
      with CreateAchievementRuleConfigurationError {

    def errorMessage: String = s"Couldn't find event configuration with id $eventId for project $projectId"
  }

  final case class EventConfigurationFieldNotFoundError(
      eventId: EventConfigurationEventId,
      fieldNames: List[String],
      projectId: ProjectId)
      extends CreateAchievementRuleConfigurationError {

    def errorMessage: String =
      s"Couldn't find field(s): '${fieldNames.mkString("', '")}' for event configuration with id $eventId for project $projectId"
  }

  final case class EventConfigurationFieldNotProvidedError(
      eventId: EventConfigurationEventId,
      fieldNames: List[String],
      projectId: ProjectId)
      extends CreateAchievementRuleConfigurationError {

    def errorMessage: String =
      s"Couldn't find settings for field(s): '${fieldNames.mkString("', '")}' for event configuration with id $eventId for project $projectId"
  }

  final case class EventConfigurationNameAlreadyUsedError(eventName: String, projectId: ProjectId)
      extends CreateEventConfigurationError {

    def errorMessage: String =
      s"Event configuration with name $eventName for project $projectId already exists"
  }

  final case class AggregationRuleConfigurationIsActiveError(
      ruleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId)
      extends DeleteAggregationRuleConfigurationError {

    def errorMessage: String =
      s"Aggregation rule configuration with id $ruleId for project $projectId is active"
  }

  final case class AggregationRuleConfigurationIsInUseError(
      ruleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId)
      extends DeleteAggregationRuleConfigurationError {

    def errorMessage: String = s"Aggregation rule configuration with id $ruleId for project $projectId is in use"
  }

  final case class AggregationRuleConfigurationNotFoundError(
      ruleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId)
      extends GetAggregationRuleConfigurationError
      with UpdateAggregationRuleConfigurationError
      with DeleteAggregationRuleConfigurationError
      with CreateAchievementRuleConfigurationError {

    def errorMessage: String =
      s"Couldn't find aggregation rule configuration with id $ruleId for project $projectId"
  }

  final case class AggregationRuleConfigurationNameAlreadyUsedError(ruleName: String, projectId: ProjectId)
      extends CreateAggregationRuleConfigurationError {

    def errorMessage: String =
      s"Aggregation rule configuration with name $ruleName for project $projectId already exists"
  }

  final case class AchievementRuleConfigurationNotFoundError(
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId)
      extends GetAchievementRuleConfigurationError
      with UpdateAchievementRuleConfigurationError
      with DeleteAchievementRuleConfigurationError {
    def errorMessage: String =
      s"Couldn't find achievement rule configuration with id $ruleId for project $projectId"
  }

  final case class AchievementRuleConfigurationIsActiveError(
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId)
      extends DeleteAchievementRuleConfigurationError {

    def errorMessage: String =
      s"Achievement rule configuration with id $ruleId for project $projectId is active"
  }

  final case class AchievementRuleConfigurationNameAlreadyUsedError(ruleName: String, projectId: ProjectId)
      extends CreateAchievementRuleConfigurationError {

    def errorMessage: String =
      s"Achievement rule configuration with name $ruleName for project $projectId already exists"
  }

  final case class UnexpectedRuleConfiguratorError(details: String, underlying: Throwable)
      extends UpdateEventConfigurationError
      with CreateEventConfigurationError
      with DeleteEventConfigurationError
      with GetEventConfigurationError
      with UpdateAggregationRuleConfigurationError
      with CreateAggregationRuleConfigurationError
      with DeleteAggregationRuleConfigurationError
      with GetAggregationRuleConfigurationError
      with CreateAchievementRuleConfigurationError
      with GetAchievementRuleConfigurationError
      with UpdateAchievementRuleConfigurationError
      with DeleteAchievementRuleConfigurationError

  object RuleConfiguratorPermissions {
    object EventWritePermission extends Permission {
      override val value: String = "rule_configurator:event:write"
    }

    object EventReadPermission extends Permission {
      override val value: String = "rule_configurator:event:read"
    }

    object EventAdminWritePermission extends Permission {
      override val value: String = "rule_configurator:admin:event:write"
    }

    object EventAdminReadPermission extends Permission {
      override val value: String = "rule_configurator:admin:event:read"
    }

    object AggregationRuleWritePermission extends Permission {
      override val value: String = "rule_configurator:aggregation:write"
    }

    object AggregationRuleReadPermission extends Permission {
      override val value: String = "rule_configurator:aggregation:read"
    }

    object AggregationRuleAdminWritePermission extends Permission {
      override val value: String = "rule_configurator:admin:aggregation:write"
    }

    object AggregationRuleAdminReadPermission extends Permission {
      override val value: String = "rule_configurator:admin:aggregation:read"
    }

    object AchievementRuleWritePermission extends Permission {
      override val value: String = "rule_configurator:achievement:write"
    }

    object AchievementRuleReadPermission extends Permission {
      override val value: String = "rule_configurator:achievement:read"
    }

    object AchievementRuleAdminWritePermission extends Permission {
      override val value: String = "rule_configurator:admin:achievement:write"
    }

    object AchievementRuleAdminReadPermission extends Permission {
      override val value: String = "rule_configurator:admin:achievement:read"
    }
  }

}
