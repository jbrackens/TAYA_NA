package stella.rules.db.aggregation

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import pl.iterators.kebs.tagged.slick.SlickSupport
import slick.basic.DatabaseConfig
import slick.dbio.DBIOAction
import slick.dbio.Effect
import slick.dbio.NoStream
import slick.jdbc.JdbcProfile

import stella.common.core.Clock
import stella.common.core.OffsetDateTimeUtils
import stella.common.models.Ids._

import stella.rules.db.CommonMappers
import stella.rules.db.ExtendedPostgresProfile
import stella.rules.db.ExtendedPostgresProfile.api._
import stella.rules.db.event.SlickEventConfigurationRepository
import stella.rules.models.Ids._
import stella.rules.models.Ids._
import stella.rules.models.aggregation
import stella.rules.models.aggregation._
import stella.rules.models.aggregation.http.AggregationRuleCondition
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest

class SlickAggregationRuleConfigurationRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)
    extends AggregationRuleConfigurationRepository
    with CommonMappers
    with SlickSupport {

  import SlickAggregationRuleConfigurationRepository._
  import dbConfig.db

  override val profile: ExtendedPostgresProfile.type = slickProfile

  // --------------- API ---------------
  override def getAggregationRuleConfigurations(projectId: ProjectId, includeInactive: Boolean)(implicit
      ec: ExecutionContext): Future[Seq[AggregationRuleConfigurationEntity]] =
    db.run {
      aggregationRuleConfigTable
        .filter(_.projectId === projectId)
        .filterIf(!includeInactive)(_.isActive === true)
        .join(SlickEventConfigurationRepository.eventConfigurationsTable)
        .on(_.eventConfigurationId === _.id)
        .joinLeft(aggregationRuleConditionTable)
        .on { case ((arc, _), cond) => arc.id === cond.configurationId }
        .map { case ((arc, ec), cond) => (arc, cond, ec.eventId) }
        .result
    }.map(fillInAggregationConditions)

  override def createAggregationRuleConfiguration(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId,
      eventId: EventConfigurationId,
      request: CreateAggregationRuleConfigurationRequest)(implicit
      ec: ExecutionContext): Future[AggregationRuleConfigurationEntity] =
    db.run {
      inTransaction {
        for {
          aggregation <- aggregationRuleConfigTable
            .returning(aggregationRuleConfigTable.map(_.id))
            .into((arc: AggregationRuleConfigurationEntity, id: AggregationRuleConfigurationId) =>
              arc.copy(id = id)) += configurationEntityFromRequest(projectId, ruleId, eventId, request, clock)
          conditions <- aggregationRuleConditionTable
            .returning(aggregationRuleConditionTable.map(_.id))
            .into((entity: AggregationRuleConditionEntity, id: AggregationRuleConditionId) =>
              entity.copy(id = id)) ++= request.aggregationConditions.map(condition =>
            conditionEntityFromRequest(aggregation.id, condition))
        } yield aggregation.copy(conditions = conditions.toList)
      }
    }

  override def getAggregationRuleConfiguration(ruleId: AggregationRuleConfigurationRuleId, projectId: ProjectId)(
      implicit ec: ExecutionContext): Future[Option[AggregationRuleConfigurationEntity]] =
    db.run {
      (for {
        ((aggregation, event), condition) <- aggregationRuleConfigTable
          .join(SlickEventConfigurationRepository.eventConfigurationsTable)
          .on(_.eventConfigurationId === _.id)
          .joinLeft(aggregationRuleConditionTable)
          .on { case ((arc, _), cond) =>
            arc.id === cond.configurationId
          }
        if aggregation.ruleId === ruleId && aggregation.projectId === projectId
      } yield (aggregation, condition, event.eventId)).result
    }.map(fillInAggregationConditions)
      .map(_.headOption)

  override def getAggregationRuleConfigurationIds(
      ruleIds: List[AggregationRuleConfigurationRuleId],
      projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId]] =
    db.run {
      aggregationRuleConfigTable
        .filter(_.projectId === projectId)
        .filter(_.ruleId.inSet(ruleIds))
        .map(aggregation => (aggregation.ruleId, aggregation.id))
        .result
    }.map(_.toMap)

  override def checkIfAggregationRuleConfigurationExists(ruleName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Boolean] =
    db.run {
      compiledCheckAggregationRuleConfigWithNameExistsQuery((ruleName, projectId)).result
    }

  override def updateAggregationRuleConfiguration(
      ruleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId,
      newIsActiveValue: Boolean,
      newDescription: String): Future[Int] =
    db.run {
      compiledUpdateAggregationRuleConfigQuery((ruleId, projectId))
        .update((newIsActiveValue, newDescription, clock.currentUtcOffsetDateTime()))
    }

  override def delete(configurationId: AggregationRuleConfigurationId)(implicit ec: ExecutionContext): Future[Unit] =
    db.run {
      inTransaction {
        DBIOAction.seq(
          aggregationRuleConditionTable.filter(_.configurationId === configurationId).delete,
          aggregationRuleConfigTable.filter(_.id === configurationId).delete)
      }
    }

  override def isEventInUse(eventConfigurationId: EventConfigurationId)(implicit
      ec: ExecutionContext): Future[Boolean] =
    db.run {
      aggregationRuleConfigTable.filter(_.eventConfigurationId === eventConfigurationId).exists.result
    }

}

object SlickAggregationRuleConfigurationRepository extends CommonMappers with SlickSupport {

  override val profile: ExtendedPostgresProfile.type = slickProfile

  private type AggregationRuleConfigRow = (
      AggregationRuleConfigurationId,
      AggregationRuleConfigurationRuleId,
      ProjectId,
      String,
      String,
      EventConfigurationId,
      IntervalType,
      OffsetDateTime,
      Option[Int],
      Option[Int],
      AggregationType,
      String,
      Option[String],
      Boolean,
      OffsetDateTime,
      OffsetDateTime)

  class AggregationRuleConfigurationTable(tag: Tag)
      extends Table[AggregationRuleConfigurationEntity](tag, "aggregation_rule_configurations") {

    def id = column[AggregationRuleConfigurationId]("id", O.PrimaryKey, O.AutoInc)
    def ruleId = column[AggregationRuleConfigurationRuleId]("rule_id")
    def projectId = column[ProjectId]("project_id")
    def name = column[String]("name")
    def description = column[String]("description")
    def eventConfigurationId = column[EventConfigurationId]("event_configuration_id")
    def resetFrequencyInterval = column[IntervalType]("reset_frequency_interval")
    def windowStartDate = column[OffsetDateTime]("window_start_date")
    def resetFrequencyLength = column[Option[Int]]("reset_frequency_length")
    def windowCountLimit = column[Option[Int]]("window_count_limit")
    def aggregationType = column[AggregationType]("aggregation_type")
    def aggregationFieldName = column[String]("aggregation_field_name")
    def aggregationGroupByFieldName = column[Option[String]]("aggregation_group_by_field_name")
    def isActive = column[Boolean]("is_active")
    def createdAt = column[OffsetDateTime]("created_at")
    def updatedAt = column[OffsetDateTime]("updated_at")

    override def * =
      (
        id,
        ruleId,
        projectId,
        name,
        description,
        eventConfigurationId,
        resetFrequencyInterval,
        windowStartDate,
        resetFrequencyLength,
        windowCountLimit,
        aggregationType,
        aggregationFieldName,
        aggregationGroupByFieldName,
        isActive,
        createdAt,
        updatedAt).<>(fromTableRow, toTableRow)

    def fromTableRow(row: AggregationRuleConfigRow): AggregationRuleConfigurationEntity = row match {
      case (
            id,
            ruleId,
            projectId,
            name,
            description,
            eventConfigurationId,
            resetFrequencyInterval,
            windowStartDate,
            resetFrequencyLength,
            windowCountLimit,
            aggregationType,
            aggregationFieldName,
            aggregationGroupByFieldName,
            isActive,
            createdAt,
            updatedAt) =>
        aggregation.AggregationRuleConfigurationEntity(
          id = id,
          ruleId = ruleId,
          projectId = projectId,
          name = name,
          description = description,
          eventConfigurationId = eventConfigurationId,
          eventConfigurationEventId = EventConfigurationEventId.dummyId,
          resetFrequencyInterval = resetFrequencyInterval,
          windowStartDate = OffsetDateTimeUtils.asUtc(windowStartDate),
          resetFrequencyLength = resetFrequencyLength,
          windowCountLimit = windowCountLimit,
          aggregationType = aggregationType,
          aggregationFieldName = aggregationFieldName,
          aggregationGroupByFieldName = aggregationGroupByFieldName,
          isActive = isActive,
          conditions = Nil,
          createdAt = OffsetDateTimeUtils.asUtc(createdAt),
          updatedAt = OffsetDateTimeUtils.asUtc(updatedAt))
    }

    def toTableRow(entity: AggregationRuleConfigurationEntity): Option[AggregationRuleConfigRow] =
      Some(
        (
          entity.id,
          entity.ruleId,
          entity.projectId,
          entity.name,
          entity.description,
          entity.eventConfigurationId,
          entity.resetFrequencyInterval,
          entity.windowStartDate,
          entity.resetFrequencyLength,
          entity.windowCountLimit,
          entity.aggregationType,
          entity.aggregationFieldName,
          entity.aggregationGroupByFieldName,
          entity.isActive,
          entity.createdAt,
          entity.updatedAt))
  }

  private class AggregationRuleConditionTable(tag: Tag)
      extends Table[AggregationRuleConditionEntity](tag, "aggregation_rule_conditions") {

    def id = column[AggregationRuleConditionId]("id", O.PrimaryKey, O.AutoInc)
    def configurationId = column[AggregationRuleConfigurationId]("aggregation_rule_configuration_id")
    def eventFieldName = column[String]("event_field_name")
    def conditionType = column[AggregationConditionType]("condition_type")
    def value = column[Option[String]]("value")

    def * = (id, configurationId, eventFieldName, conditionType, value).mapTo[AggregationRuleConditionEntity]

  }

  // --------------- queries ---------------
  val aggregationRuleConfigTable = TableQuery[AggregationRuleConfigurationTable]
  private val aggregationRuleConditionTable = TableQuery[AggregationRuleConditionTable]

  private def configurationEntityFromRequest(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId,
      eventId: EventConfigurationId,
      request: CreateAggregationRuleConfigurationRequest,
      clock: Clock) = {
    val currentDateTime = clock.currentUtcOffsetDateTime()
    val intervalDetails = request.resetFrequency.intervalDetails
    aggregation.AggregationRuleConfigurationEntity(
      id = AggregationRuleConfigurationId(0),
      ruleId = ruleId,
      projectId = projectId,
      name = request.name,
      description = request.description,
      eventConfigurationId = eventId,
      eventConfigurationEventId = request.eventConfigurationId,
      resetFrequencyInterval = request.resetFrequency.interval,
      resetFrequencyLength = intervalDetails.map(_.length),
      windowStartDate = request.resetFrequency.getWindowStartDateUTCValue,
      windowCountLimit = intervalDetails.flatMap(_.windowCountLimit),
      aggregationType = request.aggregationType,
      aggregationFieldName = request.aggregationFieldName,
      aggregationGroupByFieldName = request.aggregationGroupByFieldName,
      isActive = true,
      conditions = Nil,
      createdAt = currentDateTime,
      updatedAt = currentDateTime)
  }

  private def conditionEntityFromRequest(
      configurationId: AggregationRuleConfigurationId,
      condition: AggregationRuleCondition) =
    aggregation.AggregationRuleConditionEntity(
      id = AggregationRuleConditionId(0),
      configurationId = configurationId,
      eventFieldName = condition.eventFieldName,
      conditionType = condition.conditionType,
      value = condition.value)

  private def aggregationRuleConfigWithoutFieldsQuery(
      ruleId: Rep[AggregationRuleConfigurationRuleId],
      projectId: Rep[ProjectId]) =
    aggregationRuleConfigTable.filter(ruleConf => ruleConf.projectId === projectId && ruleConf.ruleId === ruleId)

  private def updateAggregationRuleConfigQuery(
      ruleId: Rep[AggregationRuleConfigurationRuleId],
      projectId: Rep[ProjectId]) =
    aggregationRuleConfigWithoutFieldsQuery(ruleId, projectId).map(entity =>
      (entity.isActive, entity.description, entity.updatedAt))

  private val compiledUpdateAggregationRuleConfigQuery = Compiled(updateAggregationRuleConfigQuery _)

  private def checkAggregationRuleConfigWithNameExistsQuery(ruleName: Rep[String], projectId: Rep[ProjectId]) =
    aggregationRuleConfigTable.filter(_.projectId === projectId).filter(_.name === ruleName).exists

  private val compiledCheckAggregationRuleConfigWithNameExistsQuery = Compiled(
    checkAggregationRuleConfigWithNameExistsQuery _)

  private def fillInAggregationConditions(
      joinResult: Seq[
        (AggregationRuleConfigurationEntity, Option[AggregationRuleConditionEntity], EventConfigurationEventId)])
      : Seq[AggregationRuleConfigurationEntity] =
    joinResult
      .map { case (config, condition, eventId) => (config.copy(eventConfigurationEventId = eventId), condition) }
      .groupBy { case (config, _) => config }
      .map { case (config, configsAndConditionsTuples) =>
        config.copy(conditions = configsAndConditionsTuples.flatMap { case (_, condition) => condition }.toList)
      }
      .toSeq
      .sortBy(_.id)

  private def inTransaction[R, S <: NoStream, E <: Effect](dbio: DBIOAction[R, S, E]) = dbio.transactionally
}
