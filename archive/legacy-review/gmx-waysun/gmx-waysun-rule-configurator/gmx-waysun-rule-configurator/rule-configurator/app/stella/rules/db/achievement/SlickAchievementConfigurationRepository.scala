package stella.rules.db.achievement

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import com.softwaremill.quicklens._
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
import stella.rules.db.aggregation.SlickAggregationRuleConfigurationRepository
import stella.rules.db.event.SlickEventConfigurationRepository
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.Ids._
import stella.rules.models.Ids._
import stella.rules.models.achievement
import stella.rules.models.achievement.AchievementConditionEntity
import stella.rules.models.achievement.AchievementConfigurationEntity
import stella.rules.models.achievement.AchievementEventConfigurationEntity
import stella.rules.models.achievement.AchievementEventConfigurationFieldEntity
import stella.rules.models.achievement.AchievementTriggerBehaviour
import stella.rules.models.achievement.AchievementWebhookConfigurationEntity
import stella.rules.models.achievement.AchievementWebhookConfigurationFieldEntity
import stella.rules.models.achievement.ActionType
import stella.rules.models.achievement.OperationType
import stella.rules.models.achievement.RequestType
import stella.rules.models.achievement.http.AchievementCondition
import stella.rules.models.achievement.http.AchievementEventActionPayload
import stella.rules.models.achievement.http.CreateAchievementWebhookActionDetails
import stella.rules.models.achievement.http.WebhookActionField
import stella.rules.models.aggregation.AggregationConditionType

class SlickAchievementConfigurationRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)
    extends AchievementConfigurationRepository
    with CommonMappers
    with SlickSupport {

  import dbConfig.db

  override val profile: ExtendedPostgresProfile.type = slickProfile

  private type AchievementConfigurationRow = (
      AchievementConfigurationId,
      AchievementConfigurationRuleId,
      ProjectId,
      String,
      String,
      AchievementTriggerBehaviour,
      ActionType,
      Option[AchievementEventConfigurationId],
      Option[AchievementWebhookConfigurationId],
      Boolean,
      OffsetDateTime,
      OffsetDateTime)

  private class AchievementConfigurationTable(tag: Tag)
      extends Table[AchievementConfigurationEntity](tag, "achievement_configurations") {
    def id = column[AchievementConfigurationId]("id", O.PrimaryKey, O.AutoInc)

    def ruleId = column[AchievementConfigurationRuleId]("rule_id")

    def projectId = column[ProjectId]("project_id")

    def name = column[String]("name")

    def description = column[String]("description")

    def triggerBehaviour = column[AchievementTriggerBehaviour]("trigger_behaviour")

    def actionType = column[ActionType]("action_type")

    def achievementEventConfigurationId =
      column[Option[AchievementEventConfigurationId]]("achievement_event_configuration_id")

    def achievementWebhookConfigurationId =
      column[Option[AchievementWebhookConfigurationId]]("achievement_webhook_configuration_id")

    def isActive = column[Boolean]("is_active")

    def createdAt = column[OffsetDateTime]("created_at")

    def updatedAt = column[OffsetDateTime]("updated_at")

    def * =
      (
        id,
        ruleId,
        projectId,
        name,
        description,
        triggerBehaviour,
        actionType,
        achievementEventConfigurationId,
        achievementWebhookConfigurationId,
        isActive,
        createdAt,
        updatedAt).<>(fromTableRow, toTableRow)

    def fromTableRow(row: AchievementConfigurationRow): AchievementConfigurationEntity = row match {
      case (
            id,
            ruleId,
            projectId,
            name,
            description,
            triggerBehaviour,
            actionType,
            achievementEventConfigurationId,
            achievementWebhookConfigurationId,
            isActive,
            createdAt,
            updatedAt) =>
        achievement.AchievementConfigurationEntity(
          id = id,
          ruleId = ruleId,
          projectId = projectId,
          name = name,
          description = description,
          triggerBehaviour = triggerBehaviour,
          actionType = actionType,
          achievementEventConfigurationId = achievementEventConfigurationId,
          achievementEventConfiguration = None,
          achievementWebhookConfigurationId = achievementWebhookConfigurationId,
          achievementWebhookConfiguration = None,
          conditions = Nil,
          isActive = isActive,
          createdAt = OffsetDateTimeUtils.asUtc(createdAt),
          updatedAt = OffsetDateTimeUtils.asUtc(updatedAt))
    }

    def toTableRow(entity: AchievementConfigurationEntity): Option[AchievementConfigurationRow] =
      Some(
        (
          entity.id,
          entity.ruleId,
          entity.projectId,
          entity.name,
          entity.description,
          entity.triggerBehaviour,
          entity.actionType,
          entity.achievementEventConfigurationId,
          entity.achievementWebhookConfigurationId,
          entity.isActive,
          entity.createdAt,
          entity.updatedAt))
  }

  private type AchievementConditionRow = (
      AchievementConditionId,
      AchievementConfigurationId,
      AggregationRuleConfigurationId,
      String,
      AggregationConditionType,
      Option[String],
      OffsetDateTime,
      OffsetDateTime)

  private class AchievementConditionTable(tag: Tag)
      extends Table[AchievementConditionEntity](tag, "achievement_conditions") {
    def id = column[AchievementConditionId]("id", O.PrimaryKey, O.AutoInc)

    def achievementId = column[AchievementConfigurationId]("achievement_id")

    def aggregationId = column[AggregationRuleConfigurationId]("aggregation_rule_configuration_id")

    def aggregationField = column[String]("aggregation_field")

    def conditionType = column[AggregationConditionType]("condition_type")

    def value = column[Option[String]]("value")

    def createdAt = column[OffsetDateTime]("created_at")

    def updatedAt = column[OffsetDateTime]("updated_at")

    def * = (id, achievementId, aggregationId, aggregationField, conditionType, value, createdAt, updatedAt)
      .<>(fromTableRow, toTableRow)

    def fromTableRow(row: AchievementConditionRow): AchievementConditionEntity = row match {
      case (id, achievementId, aggregationId, aggregationField, conditionType, value, createdAt, updatedAt) =>
        achievement.AchievementConditionEntity(
          id = id,
          achievementConfigurationId = achievementId,
          aggregationRuleConfigurationId = aggregationId,
          aggregationRuleConfigurationRuleId = AggregationRuleConfigurationRuleId.dummyId,
          aggregationField = aggregationField,
          conditionType = conditionType,
          value = value,
          createdAt = createdAt,
          updatedAt = updatedAt)
    }

    def toTableRow(entity: AchievementConditionEntity): Option[AchievementConditionRow] =
      Some(
        (
          entity.id,
          entity.achievementConfigurationId,
          entity.aggregationRuleConfigurationId,
          entity.aggregationField,
          entity.conditionType,
          entity.value,
          entity.createdAt,
          entity.updatedAt))
  }

  type AchievementEventConfigurationRow =
    (AchievementEventConfigurationId, EventConfigurationId, OffsetDateTime, OffsetDateTime)

  private class AchievementEventConfigurationTable(tag: Tag)
      extends Table[AchievementEventConfigurationEntity](tag, "achievement_event_configurations") {
    def id = column[AchievementEventConfigurationId]("id", O.PrimaryKey, O.AutoInc)

    def eventConfigurationId = column[EventConfigurationId]("event_configuration_id")

    def createdAt = column[OffsetDateTime]("created_at")

    def updatedAt = column[OffsetDateTime]("updated_at")

    def * = (id, eventConfigurationId, createdAt, updatedAt).<>(fromTableRow, toTableRow)

    def fromTableRow(row: AchievementEventConfigurationRow): AchievementEventConfigurationEntity = row match {
      case (id, eventConfigurationId, createdAt, updatedAt) =>
        achievement.AchievementEventConfigurationEntity(
          id = id,
          eventConfigurationId = eventConfigurationId,
          eventConfigurationEventId = EventConfigurationEventId.dummyId,
          fields = Nil,
          createdAt = createdAt,
          updatedAt = updatedAt)
    }

    def toTableRow(entity: AchievementEventConfigurationEntity): Option[AchievementEventConfigurationRow] =
      Some((entity.id, entity.eventConfigurationId, entity.createdAt, entity.updatedAt))

  }

  private class AchievementEventConfigurationFieldTable(tag: Tag)
      extends Table[AchievementEventConfigurationFieldEntity](tag, "achievement_event_configuration_fields") {
    def id = column[AchievementEventConfigurationFieldId]("id", O.PrimaryKey, O.AutoInc)

    def achievementEventConfigurationId = column[AchievementEventConfigurationId]("achievement_event_configuration_id")

    def fieldName = column[String]("field_name")

    def operationType = column[OperationType]("operation_type")

    def aggregationRuleId = column[Option[AggregationRuleConfigurationRuleId]]("aggregation_rule_id")

    def value = column[String]("value")

    def createdAt = column[OffsetDateTime]("created_at")

    def updatedAt = column[OffsetDateTime]("updated_at")

    def * =
      (id, achievementEventConfigurationId, fieldName, operationType, aggregationRuleId, value, createdAt, updatedAt)
        .mapTo[AchievementEventConfigurationFieldEntity]
  }

  type AchievementWebhookConfigurationRow =
    (
        AchievementWebhookConfigurationId,
        Option[EventConfigurationId],
        RequestType,
        String,
        OffsetDateTime,
        OffsetDateTime)

  private class AchievementWebhookConfigurationTable(tag: Tag)
      extends Table[AchievementWebhookConfigurationEntity](tag, "achievement_webhook_configurations") {
    def id = column[AchievementWebhookConfigurationId]("id", O.PrimaryKey, O.AutoInc)

    def eventConfigurationId = column[Option[EventConfigurationId]]("event_configuration_id")

    def requestType = column[RequestType]("request_type")

    def url = column[String]("url")

    def createdAt = column[OffsetDateTime]("created_at")

    def updatedAt = column[OffsetDateTime]("updated_at")

    def * = (id, eventConfigurationId, requestType, url, createdAt, updatedAt).<>(fromTableRow, toTableRow)

    def fromTableRow(row: AchievementWebhookConfigurationRow): AchievementWebhookConfigurationEntity = row match {
      case (id, eventConfigurationId, requestType, url, createdAt, updatedAt) =>
        achievement.AchievementWebhookConfigurationEntity(
          id = id,
          eventConfigurationId = eventConfigurationId,
          eventConfigurationEventId = None,
          requestType = requestType,
          url = url,
          fields = Nil,
          createdAt = createdAt,
          updatedAt = updatedAt)
    }

    def toTableRow(entity: AchievementWebhookConfigurationEntity): Option[AchievementWebhookConfigurationRow] =
      Some((entity.id, entity.eventConfigurationId, entity.requestType, entity.url, entity.createdAt, entity.updatedAt))
  }

  private class AchievementWebhookConfigurationFieldTable(tag: Tag)
      extends Table[AchievementWebhookConfigurationFieldEntity](tag, "achievement_webhook_configuration_fields") {
    def id = column[AchievementWebhookConfigurationFieldId]("id", O.PrimaryKey, O.AutoInc)

    def achievementWebhookConfigurationId =
      column[AchievementWebhookConfigurationId]("achievement_webhook_configuration_id")

    def fieldName = column[String]("field_name")

    def operationType = column[OperationType]("operation_type")

    def aggregationRuleId = column[Option[AggregationRuleConfigurationRuleId]]("aggregation_rule_id")

    def value = column[String]("value")

    def createdAt = column[OffsetDateTime]("created_at")

    def updatedAt = column[OffsetDateTime]("updated_at")

    def * =
      (id, achievementWebhookConfigurationId, fieldName, operationType, aggregationRuleId, value, createdAt, updatedAt)
        .mapTo[AchievementWebhookConfigurationFieldEntity]
  }

  private val achievementConfigurationTable = TableQuery[AchievementConfigurationTable]
  private val achievementEventTable = TableQuery[AchievementEventConfigurationTable]
  private val achievementEventFieldTable = TableQuery[AchievementEventConfigurationFieldTable]
  private val achievementConditionTable = TableQuery[AchievementConditionTable]
  private val achievementWebhookTable = TableQuery[AchievementWebhookConfigurationTable]
  private val achievementWebhookFieldTable = TableQuery[AchievementWebhookConfigurationFieldTable]

  override def getAchievementConfiguration(ruleId: AchievementConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[AchievementConfigurationEntity]] =
    for {
      achievement <- getAchievementConfigurationWithoutFieldsAndConditions(ruleId, projectId)
      eventFields <- getEventFields(achievement.flatMap(_.achievementEventConfigurationId))
      webhookFields <- getWebhookFields(achievement.flatMap(_.achievementWebhookConfigurationId))
      conditions <- getAchievementConditions(achievement.map(_.id))
    } yield achievement.map(
      _.modify(_.achievementEventConfiguration.each.fields)
        .setTo(eventFields)
        .modify(_.achievementWebhookConfiguration.each.fields)
        .setTo(webhookFields)
        .modify(_.conditions)
        .setTo(conditions))

  override def getAchievementConfigurations(projectId: ProjectId, includeInactive: Boolean)(implicit
      ec: ExecutionContext): Future[Seq[AchievementConfigurationEntity]] =
    for {
      achievements <- getAchievementConfigurationsWithoutFieldsAndConditions(projectId, includeInactive)
      eventFieldsMap <- getEventFieldsMap(achievements.flatMap(_.achievementEventConfigurationId))
      webhookFieldsMap <- getWebhookFieldsMap(achievements.flatMap(_.achievementWebhookConfigurationId))
      conditionsMap <- getAchievementConditionsMap(achievements.map(_.id))
    } yield achievements
      .map(achievement =>
        achievement
          .modify(_.achievementEventConfiguration.each.fields)
          .setTo(getEventFields(achievement.achievementEventConfigurationId, eventFieldsMap))
          .modify(_.achievementWebhookConfiguration.each.fields)
          .setTo(getWebhookFields(achievement.achievementWebhookConfigurationId, webhookFieldsMap))
          .modify(_.conditions)
          .setTo(conditionsMap.getOrElse(achievement.id, Nil)))
      .sortBy(_.id)

  override def checkIfAchievementRuleConfigurationExists(ruleName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Boolean] =
    db.run {
      compiledCheckAchievementRuleConfigWithNameExistsQuery((ruleName, projectId)).result
    }

  override def createAchievementConfigurationWithEvent(
      projectId: ProjectId,
      ruleId: AchievementConfigurationRuleId,
      eventConfigurationId: EventConfigurationId,
      aggregationIdMap: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
      achievementName: String,
      description: String,
      triggerBehaviour: AchievementTriggerBehaviour,
      actionPayload: AchievementEventActionPayload,
      conditions: List[AchievementCondition])(implicit ec: ExecutionContext): Future[AchievementConfigurationEntity] =
    db.run {
      inTransaction {
        for {
          achievementEvent <- achievementEventTable
            .returning(achievementEventTable.map(_.id))
            .into((aec: AchievementEventConfigurationEntity, id: AchievementEventConfigurationId) =>
              aec.copy(id = id)) += achievementEventEntityFromRequest(actionPayload, eventConfigurationId)
          eventFields <- achievementEventFieldTable
            .returning(achievementEventFieldTable.map(_.id))
            .into((aecf: AchievementEventConfigurationFieldEntity, id: AchievementEventConfigurationFieldId) =>
              aecf.copy(id = id)) ++= achievementEventFieldEntitiesFromRequest(actionPayload, achievementEvent.id)
          achievement <- achievementConfigurationTable
            .returning(achievementConfigurationTable.map(_.id))
            .into((ac: AchievementConfigurationEntity, id: AchievementConfigurationId) =>
              ac.copy(id = id)) += achievementConfigurationEntityFromRequest(
            ruleId,
            projectId,
            achievementName,
            description,
            triggerBehaviour,
            ActionType.Event,
            achievementEventConfigurationId = Some(achievementEvent.id))
          conditions <- achievementConditionTable
            .returning(achievementConditionTable.map(_.id))
            .into((ac: AchievementConditionEntity, id: AchievementConditionId) =>
              ac.copy(id = id)) ++= achievementConditionsFromRequest(conditions, achievement.id, aggregationIdMap)
        } yield achievement.copy(
          achievementEventConfiguration = Some(achievementEvent.copy(fields = eventFields.toList)),
          conditions = conditions.toList)
      }
    }

  override def createAchievementConfigurationWithWebhook(
      projectId: ProjectId,
      ruleId: AchievementConfigurationRuleId,
      aggregationIdMap: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
      achievementName: String,
      description: String,
      triggerBehaviour: AchievementTriggerBehaviour,
      actionDetails: CreateAchievementWebhookActionDetails,
      conditions: List[AchievementCondition])(implicit ec: ExecutionContext): Future[AchievementConfigurationEntity] =
    db.run {
      inTransaction {
        for {
          achievementWebhook <- createWebhookEventFieldsIfNeeded(actionDetails)
          achievement <- achievementConfigurationTable
            .returning(achievementConfigurationTable.map(_.id))
            .into((ac: AchievementConfigurationEntity, id: AchievementConfigurationId) =>
              ac.copy(id = id)) += achievementConfigurationEntityFromRequest(
            ruleId,
            projectId,
            achievementName,
            description,
            triggerBehaviour,
            ActionType.Webhook,
            achievementWebhookConfigurationId = Some(achievementWebhook.id))
          conditions <- achievementConditionTable
            .returning(achievementConditionTable.map(_.id))
            .into((ac: AchievementConditionEntity, id: AchievementConditionId) =>
              ac.copy(id = id)) ++= achievementConditionsFromRequest(conditions, achievement.id, aggregationIdMap)
        } yield achievement.copy(
          achievementWebhookConfiguration = Some(achievementWebhook),
          conditions = conditions.toList)
      }
    }

  private def createWebhookEventFieldsIfNeeded(actionDetails: CreateAchievementWebhookActionDetails)(implicit
      ec: ExecutionContext): DBIOAction[AchievementWebhookConfigurationEntity, NoStream, Effect.Write] =
    for {
      achievementWebhook <- achievementWebhookTable
        .returning(achievementWebhookTable.map(_.id))
        .into((awc: AchievementWebhookConfigurationEntity, id: AchievementWebhookConfigurationId) =>
          awc.copy(id = id)) += achievementWebhookEntityFromRequest(actionDetails)
      fields = actionDetails.eventConfig.map(_.setFields).toList.flatten
      webhookEventFields <- achievementWebhookFieldTable
        .returning(achievementWebhookFieldTable.map(_.id))
        .into((awcf: AchievementWebhookConfigurationFieldEntity, id: AchievementWebhookConfigurationFieldId) =>
          awcf.copy(id = id)) ++= achievementWebhookFieldEntitiesFromRequest(fields, achievementWebhook.id)
    } yield achievementWebhook.copy(fields = webhookEventFields.toList)

  override def updateAchievementRuleConfiguration(
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId,
      newIsActiveValue: Boolean,
      newDescription: String): Future[Int] =
    db.run {
      compiledUpdateAchievementRuleConfigQuery((ruleId, projectId))
        .update((newIsActiveValue, newDescription, clock.currentUtcOffsetDateTime()))
    }

  override def delete(
      id: AchievementConfigurationId,
      eventIdOpt: Option[AchievementEventConfigurationId],
      webhookIdOpt: Option[AchievementWebhookConfigurationId])(implicit ec: ExecutionContext): Future[Unit] =
    db.run {
      val eventId = eventIdOpt.getOrElse(AchievementEventConfigurationId(-1))
      val webhookId = webhookIdOpt.getOrElse(AchievementWebhookConfigurationId(-1))
      inTransaction {
        DBIOAction.seq(
          achievementConditionTable.filter(_.achievementId === id).delete,
          achievementConfigurationTable.filter(_.id === id).delete,
          achievementEventFieldTable.filter(_.achievementEventConfigurationId === eventId).delete,
          achievementEventTable.filter(_.id === eventId).delete,
          achievementWebhookFieldTable.filter(_.achievementWebhookConfigurationId === webhookId).delete,
          achievementWebhookTable.filter(_.id === webhookId).delete)
      }
    }

  override def isEventInUse(eventConfigurationId: EventConfigurationId)(implicit
      ec: ExecutionContext): Future[Boolean] =
    db.run {
      for {
        isUsedInEvent <- achievementEventTable.filter(_.eventConfigurationId === eventConfigurationId).exists.result
        isUsedInWebhook <- achievementWebhookTable.filter(_.eventConfigurationId === eventConfigurationId).exists.result
      } yield isUsedInEvent || isUsedInWebhook
    }

  override def isAggregationRuleInUse(aggregationRuleConfigurationId: AggregationRuleConfigurationId)(implicit
      ec: ExecutionContext): Future[Boolean] =
    db.run {
      achievementConditionTable.filter(_.aggregationId === aggregationRuleConfigurationId).exists.result
    }

  private def achievementConditionsFromRequest(
      conditions: List[AchievementCondition],
      achievementConfigurationId: AchievementConfigurationId,
      aggregationIdMap: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId])
      : List[AchievementConditionEntity] = {
    val now = clock.currentUtcOffsetDateTime()
    conditions.map { condition =>
      achievement.AchievementConditionEntity(
        id = AchievementConditionId(0),
        achievementConfigurationId = achievementConfigurationId,
        aggregationRuleConfigurationId = aggregationIdMap(condition.aggregationRuleId),
        aggregationRuleConfigurationRuleId = condition.aggregationRuleId,
        aggregationField = condition.aggregationField,
        conditionType = condition.conditionType,
        value = condition.value,
        createdAt = now,
        updatedAt = now)
    }
  }

  private def achievementConfigurationEntityFromRequest(
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId,
      achievementName: String,
      description: String,
      triggerBehaviour: AchievementTriggerBehaviour,
      actionType: ActionType,
      achievementEventConfigurationId: Option[AchievementEventConfigurationId] = None,
      achievementWebhookConfigurationId: Option[AchievementWebhookConfigurationId] = None)
      : AchievementConfigurationEntity = {
    val now = clock.currentUtcOffsetDateTime()
    achievement.AchievementConfigurationEntity(
      id = AchievementConfigurationId(0),
      ruleId = ruleId,
      projectId = projectId,
      name = achievementName,
      description = description,
      triggerBehaviour = triggerBehaviour,
      actionType = actionType,
      achievementEventConfigurationId = achievementEventConfigurationId,
      achievementEventConfiguration = None,
      achievementWebhookConfigurationId = achievementWebhookConfigurationId,
      achievementWebhookConfiguration = None,
      conditions = Nil,
      isActive = true,
      createdAt = now,
      updatedAt = now)
  }

  private def achievementEventEntityFromRequest(
      actionPayload: AchievementEventActionPayload,
      eventConfigurationId: EventConfigurationId): AchievementEventConfigurationEntity = {
    val now = clock.currentUtcOffsetDateTime()
    achievement.AchievementEventConfigurationEntity(
      id = AchievementEventConfigurationId(0),
      eventConfigurationId = eventConfigurationId,
      eventConfigurationEventId = actionPayload.eventId,
      fields = Nil,
      createdAt = now,
      updatedAt = now)
  }

  private def achievementEventFieldEntitiesFromRequest(
      actionPayload: AchievementEventActionPayload,
      achievementEventConfigurationId: AchievementEventConfigurationId)
      : List[AchievementEventConfigurationFieldEntity] = {
    val now = clock.currentUtcOffsetDateTime()
    actionPayload.setFields.map { field =>
      achievement.AchievementEventConfigurationFieldEntity(
        id = AchievementEventConfigurationFieldId(0),
        achievementEventConfigurationId = achievementEventConfigurationId,
        fieldName = field.fieldName,
        aggregationRuleId = field.aggregationRuleId,
        operationType = field.operation,
        value = field.value,
        createAt = now,
        updatedAt = now)
    }
  }

  private def achievementWebhookEntityFromRequest(
      actionDetails: CreateAchievementWebhookActionDetails): AchievementWebhookConfigurationEntity = {
    val now = clock.currentUtcOffsetDateTime()
    achievement.AchievementWebhookConfigurationEntity(
      id = AchievementWebhookConfigurationId(0),
      eventConfigurationId = actionDetails.eventConfig.map(_.eventConfigDbId),
      eventConfigurationEventId = actionDetails.eventConfig.map(_.eventConfigId),
      requestType = actionDetails.requestType,
      url = actionDetails.targetUrl,
      fields = Nil,
      createdAt = now,
      updatedAt = now)
  }

  private def achievementWebhookFieldEntitiesFromRequest(
      fields: List[WebhookActionField],
      achievementWebhookConfigurationId: AchievementWebhookConfigurationId)
      : List[AchievementWebhookConfigurationFieldEntity] = {
    val now = clock.currentUtcOffsetDateTime()
    fields.map { field =>
      achievement.AchievementWebhookConfigurationFieldEntity(
        id = AchievementWebhookConfigurationFieldId(0),
        achievementWebhookConfigurationId = achievementWebhookConfigurationId,
        fieldName = field.fieldName,
        aggregationRuleId = field.aggregationRuleId,
        operationType = field.operation,
        value = field.value,
        createAt = now,
        updatedAt = now)
    }
  }

  private def getEventFields(achievementEventConfigIdOpt: Option[AchievementEventConfigurationId])(implicit
      ec: ExecutionContext): Future[List[AchievementEventConfigurationFieldEntity]] =
    achievementEventConfigIdOpt match {
      case None => Future.successful(Nil)
      case Some(id) =>
        db.run {
          achievementEventFieldTable.filter(_.achievementEventConfigurationId === id).result
        }.map(_.toList)
    }

  private def getEventFields(
      achievementEventConfigIdOpt: Option[AchievementEventConfigurationId],
      eventFieldsMap: Map[AchievementEventConfigurationId, List[AchievementEventConfigurationFieldEntity]])
      : List[AchievementEventConfigurationFieldEntity] =
    achievementEventConfigIdOpt.flatMap(id => eventFieldsMap.get(id)).getOrElse(Nil)

  private def getWebhookFields(achievementWebhookConfigIdOpt: Option[AchievementWebhookConfigurationId])(implicit
      ec: ExecutionContext): Future[List[AchievementWebhookConfigurationFieldEntity]] =
    achievementWebhookConfigIdOpt match {
      case None => Future.successful(Nil)
      case Some(id) =>
        db.run {
          achievementWebhookFieldTable.filter(_.achievementWebhookConfigurationId === id).result
        }.map(_.toList)
    }

  private def getWebhookFields(
      achievementWebhookConfigIdOpt: Option[AchievementWebhookConfigurationId],
      webhookFieldsMap: Map[AchievementWebhookConfigurationId, List[AchievementWebhookConfigurationFieldEntity]])
      : List[AchievementWebhookConfigurationFieldEntity] =
    achievementWebhookConfigIdOpt.flatMap(id => webhookFieldsMap.get(id)).getOrElse(Nil)

  private def getAchievementConditions(achievementIdOpt: Option[AchievementConfigurationId])(implicit
      ec: ExecutionContext): Future[List[AchievementConditionEntity]] = achievementIdOpt match {
    case None => Future.successful(Nil)
    case Some(achievementId) =>
      db.run {
        achievementConditionTable
          .filter(_.achievementId === achievementId)
          .join(SlickAggregationRuleConfigurationRepository.aggregationRuleConfigTable)
          .on(_.aggregationId === _.id)
          .map { case (achievement, aggregation) => (achievement, aggregation.ruleId) }
          .result
          .map(_.map { case (achievement, aggregationRuleId) =>
            achievement.copy(aggregationRuleConfigurationRuleId = aggregationRuleId)
          })
      }.map(_.toList)
  }

  private def getAchievementConfigurationWithoutFieldsAndConditions(
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId)(implicit ec: ExecutionContext): Future[Option[AchievementConfigurationEntity]] =
    db.run {
      val query = for {
        ((((achievement, achievementEvent), eventEvent), achievementWebhook), webhookEvent) <-
          getAchievementConfigurationsWithoutFieldsAndConditionsQuery
        if achievement.ruleId === ruleId && achievement.projectId === projectId
      } yield (achievement, achievementEvent, eventEvent, achievementWebhook, webhookEvent)
      query.result.headOption.map(_.map {
        case (achievement, achievementEvent, eventEvent, achievementWebhook, webhookEvent) =>
          achievement.copy(
            achievementEventConfiguration = achievementEvent.flatMap(ae =>
              eventEvent.map(eventConfig => ae.copy(eventConfigurationEventId = eventConfig.eventId))),
            achievementWebhookConfiguration =
              achievementWebhook.map(_.copy(eventConfigurationEventId = webhookEvent.map(_.eventId))))
      })
    }

  private def getAchievementConfigurationsWithoutFieldsAndConditions(projectId: ProjectId, includeInactive: Boolean)(
      implicit ec: ExecutionContext): Future[List[AchievementConfigurationEntity]] =
    db.run {
      val query = for {
        ((((achievement, achievementEvent), eventEvent), achievementWebhook), webhookEvent) <-
          getAchievementConfigurationsWithoutFieldsAndConditionsQuery.filterIf(!includeInactive) {
            case ((((achievement, _), _), _), _) => achievement.isActive === true
          }
        if achievement.projectId === projectId
      } yield (achievement, achievementEvent, eventEvent, achievementWebhook, webhookEvent)
      query.result.map(_.map { case (achievement, achievementEvent, eventEvent, achievementWebhook, webhookEvent) =>
        achievement.copy(
          achievementEventConfiguration = achievementEvent.flatMap(ae =>
            eventEvent.map(eventConfig => ae.copy(eventConfigurationEventId = eventConfig.eventId))),
          achievementWebhookConfiguration =
            achievementWebhook.map(_.copy(eventConfigurationEventId = webhookEvent.map(_.eventId))))
      }.toList)
    }

  private val getAchievementConfigurationsWithoutFieldsAndConditionsQuery =
    achievementConfigurationTable
      .joinLeft(achievementEventTable)
      .on(_.achievementEventConfigurationId === _.id)
      .joinLeft(SlickEventConfigurationRepository.eventConfigurationsTable)
      .on { case ((_, achievementEvent), event) => achievementEvent.map(_.eventConfigurationId === event.id) }
      .joinLeft(achievementWebhookTable)
      .on { case (((achievement, _), _), achievementWebhook) =>
        achievement.achievementWebhookConfigurationId === achievementWebhook.id
      }
      .joinLeft(SlickEventConfigurationRepository.eventConfigurationsTable)
      .on { case ((((_, _), _), achievementWebhook), webhookEvent) =>
        achievementWebhook.flatMap(_.eventConfigurationId) === webhookEvent.id
      }

  private def checkAchievementRuleConfigWithNameExistsQuery(ruleName: Rep[String], projectId: Rep[ProjectId]) =
    achievementConfigurationTable.filter(_.projectId === projectId).filter(_.name === ruleName).exists

  private val compiledCheckAchievementRuleConfigWithNameExistsQuery = Compiled(
    checkAchievementRuleConfigWithNameExistsQuery _)

  private def getEventFieldsMap(eventIds: List[AchievementEventConfigurationId])(implicit ec: ExecutionContext)
      : Future[Map[AchievementEventConfigurationId, List[AchievementEventConfigurationFieldEntity]]] =
    db.run {
      achievementEventFieldTable.filter(_.achievementEventConfigurationId.inSet(eventIds)).result
    }.map(_.toList.groupBy(_.achievementEventConfigurationId))

  private def getWebhookFieldsMap(webhookIds: List[AchievementWebhookConfigurationId])(implicit ec: ExecutionContext)
      : Future[Map[AchievementWebhookConfigurationId, List[AchievementWebhookConfigurationFieldEntity]]] =
    db.run {
      achievementWebhookFieldTable.filter(_.achievementWebhookConfigurationId.inSet(webhookIds)).result
    }.map(_.toList.groupBy(_.achievementWebhookConfigurationId))

  private def getAchievementConditionsMap(achievementIds: List[AchievementConfigurationId])(implicit
      ec: ExecutionContext): Future[Map[AchievementConfigurationId, List[AchievementConditionEntity]]] =
    db.run {
      achievementConditionTable
        .filter(_.achievementId.inSet(achievementIds))
        .join(SlickAggregationRuleConfigurationRepository.aggregationRuleConfigTable)
        .on(_.aggregationId === _.id)
        .map { case (achievement, aggregation) => (achievement, aggregation.ruleId) }
        .result
        .map(_.map { case (achievement, aggregationRuleId) =>
          achievement.copy(aggregationRuleConfigurationRuleId = aggregationRuleId)
        })
    }.map(_.toList.groupBy(_.achievementConfigurationId))

  private def updateAchievementRuleConfigQuery(ruleId: Rep[AchievementConfigurationRuleId], projectId: Rep[ProjectId]) =
    achievementConfigurationTable
      .filter(ruleConf => ruleConf.projectId === projectId && ruleConf.ruleId === ruleId)
      .map(entity => (entity.isActive, entity.description, entity.updatedAt))

  private val compiledUpdateAchievementRuleConfigQuery = Compiled(updateAchievementRuleConfigQuery _)

  private def inTransaction[R, S <: NoStream, E <: Effect](dbio: DBIOAction[R, S, E]) = dbio.transactionally
}
