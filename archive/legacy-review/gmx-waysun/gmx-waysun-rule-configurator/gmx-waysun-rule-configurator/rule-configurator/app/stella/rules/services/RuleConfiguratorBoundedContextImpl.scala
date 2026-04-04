package stella.rules.services

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.implicits.toTraverseOps
import cats.instances.future._

import stella.common.kafka.KafkaPublicationServiceImpl
import stella.common.kafka.KafkaPublicationServiceImpl.EventSubmissionTimeoutException
import stella.common.kafka.KafkaPublicationServiceImpl.UnexpectedEventSubmissionException
import stella.common.models.Ids._

import stella.rules.db.achievement.AchievementConfigurationRepository
import stella.rules.db.aggregation.AggregationRuleConfigurationRepository
import stella.rules.db.event.EventConfigurationRepository
import stella.rules.models.Ids._
import stella.rules.models.Ids._
import stella.rules.models.achievement.AchievementConfigurationEntity
import stella.rules.models.achievement.http._
import stella.rules.models.aggregation.AggregationRuleConfigurationEntity
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.models.event.EventConfigurationEntity
import stella.rules.models.event.EventFieldEntity
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.UpdateEventConfigurationRequest
import stella.rules.services.RuleConfiguratorBoundedContext._
import stella.rules.services.kafka.KafkaAchievementConfigurationPublisher
import stella.rules.services.kafka.KafkaAggregationRuleConfigurationPublisher
import stella.rules.services.kafka.KafkaEventConfigurationPublisher

class RuleConfiguratorBoundedContextImpl(
    eventConfigurationRepository: EventConfigurationRepository,
    aggregationRuleConfigurationRepository: AggregationRuleConfigurationRepository,
    achievementConfigurationRepository: AchievementConfigurationRepository,
    kafkaEventConfigurationPublisher: KafkaEventConfigurationPublisher,
    kafkaAggregationRuleConfigurationPublisher: KafkaAggregationRuleConfigurationPublisher,
    kafkaAchievementConfigurationPublisher: KafkaAchievementConfigurationPublisher,
    eventIdProvider: EventIdProvider,
    aggregationRuleIdProvider: AggregationRuleIdProvider,
    achievementRuleIdProvider: AchievementRuleIdProvider)
    extends RuleConfiguratorBoundedContext {

  override def getEventConfigurations(includeInactive: Boolean, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[EventConfiguration]] =
    for {
      eventConfigEntities <- eventConfigurationRepository.getEventConfigurations(projectId, includeInactive)
    } yield eventConfigEntities.map(_.toEventConfiguration)

  override def createEventConfiguration(request: CreateEventConfigurationRequest, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, CreateEventConfigurationError, EventConfiguration] = {
    val eventId = eventIdProvider.generateId()
    for {
      _ <- ensureEventConfigurationWithNameDoesNotExist(request.name, projectId)
      eventConfigEntity <- EitherT.liftF(
        eventConfigurationRepository.createEventConfigurationAndFields(eventId, projectId, request))
      eventConfig = eventConfigEntity.toEventConfiguration
      _ <- kafkaEventConfigurationPublisher
        .publish(eventConfig, projectId)
        .leftMap(handleKafkaPublicationError[CreateEventConfigurationError])
    } yield eventConfig
  }

  override def getEventConfiguration(eventId: EventConfigurationEventId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, GetEventConfigurationError, EventConfiguration] =
    for {
      eventConfigEntity <- getEventConfigurationEntity[GetEventConfigurationError](eventId, projectId)
    } yield eventConfigEntity.toEventConfiguration

  override def updateEventConfiguration(
      eventId: EventConfigurationEventId,
      request: UpdateEventConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateEventConfigurationError, EventConfiguration] =
    for {
      oldEventConfigEntity <- getEventConfigurationEntity[UpdateEventConfigurationError](eventId, projectId)
      newEventConfig <-
        if (request.containsChanges(oldEventConfigEntity)) {
          val newIsActiveValue = request.isActive.getOrElse(oldEventConfigEntity.isActive)
          val newDescription = request.description.getOrElse(oldEventConfigEntity.description)
          updateEventConfigurationDetails(
            eventId,
            projectId,
            oldEventConfigEntity.isActive,
            newIsActiveValue,
            newDescription)
        } else
          EitherT.rightT[Future, UpdateEventConfigurationError](oldEventConfigEntity.toEventConfiguration)
    } yield newEventConfig

  override def deleteEventConfiguration(eventId: EventConfigurationEventId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteEventConfigurationError, Unit] =
    for {
      eventConfigEntity <- getEventConfigurationEntityWithoutFields[DeleteEventConfigurationError](eventId, projectId)
      _ <- verifyIsNotActive(eventConfigEntity)
      _ <- verifyIsNotInUse(eventConfigEntity)
      _ <- EitherT.liftF(eventConfigurationRepository.deleteEventConfigurationAndFields(eventConfigEntity))
      // note we don't need to delete it from Kafka (which means sending an empty value for a key)
      // because it was already done when deactivating an event
    } yield ()

  override def getAggregationRuleConfigurations(includeInactive: Boolean, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[AggregationRuleConfiguration]] = {
    for {
      aggregationRuleConfigEntities <- aggregationRuleConfigurationRepository.getAggregationRuleConfigurations(
        projectId,
        includeInactive)
    } yield aggregationRuleConfigEntities.map(_.toAggregationRuleConfiguration)
  }

  override def createAggregationRuleConfiguration(
      request: CreateAggregationRuleConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, CreateAggregationRuleConfigurationError, AggregationRuleConfiguration] = {
    val ruleId = aggregationRuleIdProvider.generateId()
    for {
      _ <- ensureAggregationRuleConfigurationWithNameDoesNotExist(request.name, projectId)
      eventConfigurationEntity <- getEventConfigurationEntity[CreateAggregationRuleConfigurationError](
        request.eventConfigurationId,
        projectId)
      eventConfigurationId = eventConfigurationEntity.id
      aggregationConfigEntity <- EitherT.liftF(
        aggregationRuleConfigurationRepository
          .createAggregationRuleConfiguration(projectId, ruleId, eventConfigurationId, request))
      aggregationConfig = aggregationConfigEntity.toAggregationRuleConfiguration
      _ <- kafkaAggregationRuleConfigurationPublisher
        .publish(aggregationConfig, projectId)
        .leftMap(handleKafkaPublicationError[CreateAggregationRuleConfigurationError])
    } yield aggregationConfig
  }

  override def getAggregationRuleConfiguration(
      ruleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, GetAggregationRuleConfigurationError, AggregationRuleConfiguration] = {
    for {
      aggregationRuleConfig <- getAggregationRuleConfigurationEntity[GetAggregationRuleConfigurationError](
        ruleId,
        projectId)
    } yield aggregationRuleConfig.toAggregationRuleConfiguration
  }

  override def updateAggregationRuleConfiguration(
      ruleId: AggregationRuleConfigurationRuleId,
      request: UpdateAggregationRuleConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateAggregationRuleConfigurationError, AggregationRuleConfiguration] = {
    for {
      oldAggregationRuleConfigEntity <- getAggregationRuleConfigurationEntity[UpdateAggregationRuleConfigurationError](
        ruleId,
        projectId)
      newAggregationRuleConfig <-
        if (request.containsChanges(oldAggregationRuleConfigEntity)) {
          val newIsActiveValue = request.isActive.getOrElse(oldAggregationRuleConfigEntity.isActive)
          val newDescription = request.description.getOrElse(oldAggregationRuleConfigEntity.description)
          updateAggregationRuleConfigurationDetails(
            ruleId,
            projectId,
            oldAggregationRuleConfigEntity.isActive,
            newIsActiveValue,
            newDescription)
        } else
          EitherT.rightT[Future, UpdateAggregationRuleConfigurationError](
            oldAggregationRuleConfigEntity.toAggregationRuleConfiguration)
    } yield newAggregationRuleConfig
  }

  override def deleteAggregationRuleConfiguration(ruleId: AggregationRuleConfigurationRuleId, projectId: ProjectId)(
      implicit ec: ExecutionContext): EitherT[Future, DeleteAggregationRuleConfigurationError, Unit] = {
    for {
      aggregationEntity <- getAggregationRuleConfigurationEntity[DeleteAggregationRuleConfigurationError](
        ruleId,
        projectId)
      _ <- verifyIsNotActive(aggregationEntity)
      _ <- verifyIsNotInUse(aggregationEntity)
      _ <- EitherT.liftF(aggregationRuleConfigurationRepository.delete(aggregationEntity.id))
    } yield ()
  }

  override def getAchievementRuleConfigurations(includeInactive: Boolean, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[AchievementRuleConfiguration]] =
    for {
      achievementEntities <- achievementConfigurationRepository.getAchievementConfigurations(projectId, includeInactive)
    } yield achievementEntities.map(_.toAchievementRuleConfiguration)

  override def createAchievementRuleConfiguration(
      request: CreateAchievementRuleConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, CreateAchievementRuleConfigurationError, AchievementRuleConfiguration] = {
    val ruleId = achievementRuleIdProvider.generateId()
    for {
      _ <- ensureAchievementRuleConfigurationWithNameDoesNotExist(request.achievementName, projectId)
      aggregationIdsMap <- getAggregationRuleConfigurationIds(request.getConditionAggregationRuleIds, projectId)
      achievementEntity <- request.action.payload match {
        case payload: AchievementEventActionPayload =>
          createAchievementRuleConfigurationWithEvent(request, ruleId, projectId, aggregationIdsMap, payload)
        case payload: AchievementWebhookActionPayload =>
          createAchievementRuleConfigurationWithWebhook(request, ruleId, projectId, aggregationIdsMap, payload)
      }
      achievementConfig = achievementEntity.toAchievementRuleConfiguration
      _ <- kafkaAchievementConfigurationPublisher
        .publish(achievementConfig, projectId)
        .leftMap(handleKafkaPublicationError[CreateAchievementRuleConfigurationError])
    } yield achievementConfig
  }

  private def createAchievementRuleConfigurationWithEvent(
      request: CreateAchievementRuleConfigurationRequest,
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId,
      aggregationIdsMap: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
      payload: AchievementEventActionPayload)(implicit ec: ExecutionContext)
      : EitherT[Future, CreateAchievementRuleConfigurationError, AchievementConfigurationEntity] = {
    for {
      eventConfig <- getEventConfigurationEntity(payload.eventId, projectId)
      _ <- checkAchievementEventActionPayload(payload, eventConfig.fields, projectId)
      achievementEntity <- EitherT.liftF(
        achievementConfigurationRepository.createAchievementConfigurationWithEvent(
          projectId,
          ruleId,
          eventConfig.id,
          aggregationIdsMap,
          request.achievementName,
          request.description,
          request.triggerBehaviour.getOrElse(
            CreateAchievementRuleConfigurationRequest.defaultAchievementTriggerBehaviour),
          payload,
          request.conditions))
    } yield achievementEntity
  }

  private def createAchievementRuleConfigurationWithWebhook(
      request: CreateAchievementRuleConfigurationRequest,
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId,
      aggregationIdsMap: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
      payload: AchievementWebhookActionPayload)(implicit ec: ExecutionContext)
      : EitherT[Future, CreateAchievementRuleConfigurationError, AchievementConfigurationEntity] = {
    for {
      createWebhookActionEventConfig <- payload.eventConfig.traverse { webhookActionEventConfig =>
        for {
          eventConfig <- getEventConfigurationEntity(webhookActionEventConfig.eventId, projectId)
          _ <- checkAchievementWebhookActionPayload(payload, eventConfig.fields, projectId)
        } yield CreateWebhookActionEventConfig(
          eventConfig.id,
          webhookActionEventConfig.eventId,
          webhookActionEventConfig.setFields)
      }
      achievementEntity <- EitherT.liftF(
        achievementConfigurationRepository.createAchievementConfigurationWithWebhook(
          projectId,
          ruleId,
          aggregationIdsMap,
          request.achievementName,
          request.description,
          request.triggerBehaviour.getOrElse(
            CreateAchievementRuleConfigurationRequest.defaultAchievementTriggerBehaviour),
          CreateAchievementWebhookActionDetails(payload.requestType, payload.targetUrl, createWebhookActionEventConfig),
          request.conditions))
    } yield achievementEntity
  }

  override def getAchievementRuleConfiguration(ruleId: AchievementConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, GetAchievementRuleConfigurationError, AchievementRuleConfiguration] = {
    EitherT
      .fromOptionF(
        achievementConfigurationRepository.getAchievementConfiguration(ruleId, projectId),
        AchievementRuleConfigurationNotFoundError(ruleId, projectId): GetAchievementRuleConfigurationError)
      .map(_.toAchievementRuleConfiguration)
  }

  override def updateAchievementRuleConfiguration(
      ruleId: AchievementConfigurationRuleId,
      request: UpdateAchievementRuleConfigurationRequest,
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateAchievementRuleConfigurationError, AchievementRuleConfiguration] = {
    for {
      oldConfigEntity <- getAchievementConfigurationEntity[UpdateAchievementRuleConfigurationError](ruleId, projectId)
      newAchievementConfig <-
        if (request.containsChanges(oldConfigEntity)) {
          val newIsActiveValue = request.isActive.getOrElse(oldConfigEntity.isActive)
          val newDescription = request.description.getOrElse(oldConfigEntity.description)
          updateAchievementConfigurationDetails(
            ruleId,
            projectId,
            oldConfigEntity.isActive,
            newIsActiveValue,
            newDescription)
        } else
          EitherT.rightT[Future, UpdateAchievementRuleConfigurationError](
            oldConfigEntity.toAchievementRuleConfiguration)
    } yield newAchievementConfig
  }

  override def deleteAchievementRuleConfiguration(ruleId: AchievementConfigurationRuleId, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteAchievementRuleConfigurationError, Unit] = {
    for {
      achievementEntity <- getAchievementConfigurationEntity[DeleteAchievementRuleConfigurationError](ruleId, projectId)
      _ <- verifyIsNotActive(achievementEntity)
      _ <- EitherT.liftF(
        achievementConfigurationRepository.delete(
          achievementEntity.id,
          achievementEntity.achievementEventConfigurationId,
          achievementEntity.achievementWebhookConfigurationId))
    } yield ()
  }

  private def updateEventConfigurationDetails(
      eventId: EventConfigurationEventId,
      projectId: ProjectId,
      oldIsActiveValue: Boolean,
      newIsActiveValue: Boolean,
      newDescription: String)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateEventConfigurationError, EventConfiguration] =
    for {
      _ <- EitherT.liftF(
        eventConfigurationRepository.updateEventConfiguration(eventId, projectId, newIsActiveValue, newDescription))
      updatedEventConfigEntity <- getEventConfigurationEntity[UpdateEventConfigurationError](eventId, projectId)
      updatedEventConfig = updatedEventConfigEntity.toEventConfiguration
      _ <-
        if (oldIsActiveValue || newIsActiveValue)
          kafkaEventConfigurationPublisher
            .publish(updatedEventConfig, projectId)
            .leftMap(handleKafkaPublicationError[UpdateEventConfigurationError])
        else
          EitherT[Future, UpdateEventConfigurationError, Unit](Future.successful(Right(())))
    } yield updatedEventConfig

  // we need to return an error's supertype due to the problems with EitherT variance
  private def getEventConfigurationEntity[E >: EventConfigurationNotFoundError](
      eventId: EventConfigurationEventId,
      projectId: ProjectId)(implicit ec: ExecutionContext): EitherT[Future, E, EventConfigurationEntity] =
    EitherT.fromOptionF(
      eventConfigurationRepository.getEventConfiguration(eventId, projectId),
      EventConfigurationNotFoundError(eventId, projectId))

  private def ensureEventConfigurationWithNameDoesNotExist(eventName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, EventConfigurationNameAlreadyUsedError, Unit] =
    EitherT {
      eventConfigurationRepository.checkIfEventConfigurationExists(eventName, projectId).map { exists =>
        if (exists) Left(EventConfigurationNameAlreadyUsedError(eventName, projectId)) else Right(())
      }
    }

  private def checkAchievementEventActionPayload(
      eventActionPayload: AchievementEventActionPayload,
      eventFields: List[EventFieldEntity],
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, CreateAchievementRuleConfigurationError, Unit] = {
    val fieldNamesFromRequest = eventActionPayload.setFields.map(_.fieldName)
    checkEventFields(eventFields, projectId, eventActionPayload.eventId, fieldNamesFromRequest)
  }

  private def checkAchievementWebhookActionPayload(
      webhookActionPayload: AchievementWebhookActionPayload,
      eventFields: List[EventFieldEntity],
      projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, CreateAchievementRuleConfigurationError, Unit] =
    webhookActionPayload.eventConfig match {
      case Some(eventConfig) =>
        val fieldNamesFromRequest = eventConfig.setFields.map(_.fieldName)
        checkEventFields(eventFields, projectId, eventConfig.eventId, fieldNamesFromRequest)
      case None => EitherT.fromEither(Right(()))
    }

  private def checkEventFields(
      eventFields: List[EventFieldEntity],
      projectId: ProjectId,
      eventId: EventConfigurationEventId,
      fieldNamesFromRequest: List[String])(implicit
      ec: ExecutionContext): EitherT[Future, CreateAchievementRuleConfigurationError, Unit] = {
    val eventFieldNames = eventFields.map(_.name)
    val notDefinedFields = fieldNamesFromRequest.filterNot(eventFieldNames.contains)
    val fieldsNotProvided = eventFieldNames.filterNot(fieldNamesFromRequest.contains)
    if (notDefinedFields.nonEmpty) {
      EitherT.fromEither(Left(EventConfigurationFieldNotFoundError(eventId, notDefinedFields, projectId)))
    } else if (fieldsNotProvided.nonEmpty) {
      EitherT.fromEither(Left(EventConfigurationFieldNotProvidedError(eventId, fieldsNotProvided, projectId)))
    } else {
      EitherT.fromEither(Right(()))
    }
  }

  private def getEventConfigurationEntityWithoutFields[E >: EventConfigurationNotFoundError](
      eventId: EventConfigurationEventId,
      projectId: ProjectId)(implicit ec: ExecutionContext): EitherT[Future, E, EventConfigurationEntity] =
    EitherT.fromOptionF(
      eventConfigurationRepository.getEventConfigurationWithoutFields(eventId, projectId),
      EventConfigurationNotFoundError(eventId, projectId))

  private def verifyIsNotActive(eventConfigEntity: EventConfigurationEntity)(implicit
      ec: ExecutionContext): EitherT[Future, EventConfigurationIsActiveError, Unit] =
    EitherT.cond(
      !eventConfigEntity.isActive,
      (),
      EventConfigurationIsActiveError(eventConfigEntity.eventId, eventConfigEntity.projectId))

  private def verifyIsNotInUse(eventConfigEntity: EventConfigurationEntity)(implicit
      ec: ExecutionContext): EitherT[Future, EventConfigurationIsInUseError, Unit] =
    for {
      isUsedInAggregationRule <- EitherT.liftF(
        aggregationRuleConfigurationRepository.isEventInUse(eventConfigEntity.id))
      _ <- EitherT.cond[Future](
        !isUsedInAggregationRule,
        (),
        EventConfigurationIsInUseError(eventConfigEntity.eventId, eventConfigEntity.projectId))
      isUsedInAchievementConfiguration <- EitherT.liftF(
        achievementConfigurationRepository.isEventInUse(eventConfigEntity.id))
      _ <- EitherT.cond[Future](
        !isUsedInAchievementConfiguration,
        (),
        EventConfigurationIsInUseError(eventConfigEntity.eventId, eventConfigEntity.projectId))
    } yield ()

  private def verifyIsNotActive(aggregationRuleConfigurationEntity: AggregationRuleConfigurationEntity)(implicit
      ec: ExecutionContext): EitherT[Future, AggregationRuleConfigurationIsActiveError, Unit] =
    EitherT.cond(
      !aggregationRuleConfigurationEntity.isActive,
      (),
      AggregationRuleConfigurationIsActiveError(
        aggregationRuleConfigurationEntity.ruleId,
        aggregationRuleConfigurationEntity.projectId))

  private def verifyIsNotInUse(aggregationRuleConfigurationEntity: AggregationRuleConfigurationEntity)(implicit
      ec: ExecutionContext): EitherT[Future, AggregationRuleConfigurationIsInUseError, Unit] =
    for {
      isUsedInAchievementConfiguration <- EitherT.liftF(
        achievementConfigurationRepository.isAggregationRuleInUse(aggregationRuleConfigurationEntity.id))
      _ <- EitherT.cond[Future](
        !isUsedInAchievementConfiguration,
        (),
        AggregationRuleConfigurationIsInUseError(
          aggregationRuleConfigurationEntity.ruleId,
          aggregationRuleConfigurationEntity.projectId))
    } yield ()

  private def updateAggregationRuleConfigurationDetails(
      ruleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId,
      oldIsActiveValue: Boolean,
      newIsActiveValue: Boolean,
      newDescription: String)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateAggregationRuleConfigurationError, AggregationRuleConfiguration] =
    for {
      _ <- EitherT.liftF(
        aggregationRuleConfigurationRepository
          .updateAggregationRuleConfiguration(ruleId, projectId, newIsActiveValue, newDescription))
      updatedAggregationRuleConfigEntity <- getAggregationRuleConfigurationEntity[
        UpdateAggregationRuleConfigurationError](ruleId, projectId)
      updatedAggregationRuleConfig = updatedAggregationRuleConfigEntity.toAggregationRuleConfiguration
      _ <-
        if (oldIsActiveValue || newIsActiveValue)
          kafkaAggregationRuleConfigurationPublisher
            .publish(updatedAggregationRuleConfig, projectId)
            .leftMap(handleKafkaPublicationError[UpdateAggregationRuleConfigurationError])
        else
          EitherT[Future, UpdateAggregationRuleConfigurationError, Unit](Future.successful(Right(())))
    } yield updatedAggregationRuleConfig

  private def getAggregationRuleConfigurationEntity[E >: AggregationRuleConfigurationNotFoundError](
      ruleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId)(implicit ec: ExecutionContext): EitherT[Future, E, AggregationRuleConfigurationEntity] =
    EitherT.fromOptionF(
      aggregationRuleConfigurationRepository.getAggregationRuleConfiguration(ruleId, projectId),
      AggregationRuleConfigurationNotFoundError(ruleId, projectId))

  private def ensureAggregationRuleConfigurationWithNameDoesNotExist(ruleName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, AggregationRuleConfigurationNameAlreadyUsedError, Unit] =
    EitherT {
      aggregationRuleConfigurationRepository.checkIfAggregationRuleConfigurationExists(ruleName, projectId).map {
        exists =>
          if (exists) Left(AggregationRuleConfigurationNameAlreadyUsedError(ruleName, projectId)) else Right(())
      }
    }

  private def getAchievementConfigurationEntity[E >: AchievementRuleConfigurationNotFoundError](
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId)(implicit ec: ExecutionContext): EitherT[Future, E, AchievementConfigurationEntity] =
    EitherT.fromOptionF(
      achievementConfigurationRepository.getAchievementConfiguration(ruleId, projectId),
      AchievementRuleConfigurationNotFoundError(ruleId, projectId))

  private def ensureAchievementRuleConfigurationWithNameDoesNotExist(ruleName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, AchievementRuleConfigurationNameAlreadyUsedError, Unit] =
    EitherT {
      achievementConfigurationRepository.checkIfAchievementRuleConfigurationExists(ruleName, projectId).map { exists =>
        if (exists) Left(AchievementRuleConfigurationNameAlreadyUsedError(ruleName, projectId)) else Right(())
      }
    }

  private def getAggregationRuleConfigurationIds[E >: AggregationRuleConfigurationNotFoundError](
      ruleIds: List[AggregationRuleConfigurationRuleId],
      projectId: ProjectId)(implicit ec: ExecutionContext)
      : EitherT[Future, E, Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId]] =
    EitherT(for {
      aggregationRuleIdToIdMap <- aggregationRuleConfigurationRepository
        .getAggregationRuleConfigurationIds(ruleIds, projectId)
      aggregationRuleIdToIdMapKeySet = aggregationRuleIdToIdMap.keySet
      maybeRuleId = ruleIds.find(r => !aggregationRuleIdToIdMapKeySet.contains(r))
    } yield maybeRuleId match {
      case Some(ruleId) => Left(AggregationRuleConfigurationNotFoundError(ruleId, projectId))
      case None         => Right(aggregationRuleIdToIdMap)
    })

  private def updateAchievementConfigurationDetails(
      ruleId: AchievementConfigurationRuleId,
      projectId: ProjectId,
      oldIsActiveValue: Boolean,
      newIsActiveValue: Boolean,
      newDescription: String)(implicit
      ec: ExecutionContext): EitherT[Future, UpdateAchievementRuleConfigurationError, AchievementRuleConfiguration] =
    for {
      _ <- EitherT.liftF(
        achievementConfigurationRepository
          .updateAchievementRuleConfiguration(ruleId, projectId, newIsActiveValue, newDescription))
      updatedConfigEntity <- getAchievementConfigurationEntity[UpdateAchievementRuleConfigurationError](
        ruleId,
        projectId)
      updatedAchievementConfig = updatedConfigEntity.toAchievementRuleConfiguration
      _ <-
        if (oldIsActiveValue || newIsActiveValue)
          kafkaAchievementConfigurationPublisher
            .publish(updatedAchievementConfig, projectId)
            .leftMap(handleKafkaPublicationError[UpdateAchievementRuleConfigurationError])
        else
          EitherT[Future, UpdateAchievementRuleConfigurationError, Unit](Future.successful(Right(())))
    } yield updatedAchievementConfig

  private def verifyIsNotActive(configurationEntity: AchievementConfigurationEntity)(implicit
      ec: ExecutionContext): EitherT[Future, AchievementRuleConfigurationIsActiveError, Unit] =
    EitherT.cond(
      !configurationEntity.isActive,
      (),
      AchievementRuleConfigurationIsActiveError(configurationEntity.ruleId, configurationEntity.projectId))

  private def handleKafkaPublicationError[E >: UnexpectedRuleConfiguratorError](
      error: KafkaPublicationServiceImpl.EventSubmissionError): E =
    error match {
      case e: EventSubmissionTimeoutException =>
        UnexpectedRuleConfiguratorError("Kafka publication timed out", e.underlying)
      case e: UnexpectedEventSubmissionException =>
        UnexpectedRuleConfiguratorError(e.details, e.underlying)
    }
}
