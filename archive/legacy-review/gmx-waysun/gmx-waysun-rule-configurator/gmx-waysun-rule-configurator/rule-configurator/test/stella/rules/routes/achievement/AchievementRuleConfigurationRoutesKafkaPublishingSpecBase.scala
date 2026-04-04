package stella.rules.routes.achievement

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters.CollectionHasAsScala
import scala.util.Random

import cats.data.EitherT
import org.scalacheck.Gen
import org.scalamock.matchers.ArgCapture.CaptureOne
import org.scalamock.scalatest.MockFactory
import org.scalatest.Inside
import org.scalatest.OptionValues
import org.scalatestplus.play.BaseOneAppPerSuite
import org.scalatestplus.play.FakeApplicationFactory
import org.scalatestplus.play.PlaySpec
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks
import play.api.Application
import play.api.ApplicationLoader.Context
import play.api.http.HeaderNames
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.common.core.OffsetDateTimeUtils
import stella.common.http.BearerToken
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError
import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext
import stella.common.kafka.KafkaPublicationInfo
import stella.common.kafka.KafkaPublicationService
import stella.common.kafka.KafkaPublicationServiceImpl.EventSubmissionError
import stella.common.models.Ids._
import stella.dataapi.achievement.AchievementConfiguration
import stella.dataapi.aggregation
import stella.dataapi.eventconfigurations
import stella.dataapi.{achievement => dataapi}

import stella.rules.RuleConfiguratorComponents
import stella.rules.db.achievement.AchievementConfigurationRepository
import stella.rules.db.aggregation.AggregationRuleConfigurationRepository
import stella.rules.db.event.EventConfigurationRepository
import stella.rules.gen.Generators._
import stella.rules.models.Ids._
import stella.rules.models.achievement
import stella.rules.models.achievement._
import stella.rules.models.achievement.http._
import stella.rules.models.event.EventConfigurationEntity
import stella.rules.models.event.EventFieldEntity
import stella.rules.models.event.FieldValueType
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.EventField
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestRuleConfiguratorAppBuilder
import stella.rules.services.AchievementRuleIdProvider

trait AchievementRuleConfigurationRoutesKafkaPublishingSpecBase
    extends PlaySpec
    with BaseOneAppPerSuite
    with FakeApplicationFactory
    with MockFactory
    with ScalaCheckDrivenPropertyChecks
    with OptionValues
    with Inside {

  protected val allowedProjectIdGen: Gen[ProjectId]
  private val testAuthContextToReturn =
    EitherT[Future, JwtAuthorizationError, StellaAuthContext](Future.successful(Right(testAuthContext)))

  private val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]
  private val kafkaService
      : KafkaPublicationService[dataapi.AchievementConfigurationKey, dataapi.AchievementConfiguration] =
    mock[KafkaPublicationService[dataapi.AchievementConfigurationKey, dataapi.AchievementConfiguration]]
  private val eventRepo: EventConfigurationRepository = mock[EventConfigurationRepository]
  private val aggregationRepo: AggregationRuleConfigurationRepository = mock[AggregationRuleConfigurationRepository]
  private val repo: AchievementConfigurationRepository = mock[AchievementConfigurationRepository]
  private val nullValue = None.orNull

  protected def checkWritePermissionIsExpected(): Unit
  protected def testAchievementRulesEndpointPath(projectId: ProjectId): String
  protected def testAchievementRuleEndpointPath(projectId: ProjectId, ruleId: AchievementConfigurationRuleId): String

  override def fakeApplication(): Application = new TestRuleConfiguratorAppBuilder {
    override def createRuleConfiguratorComponents(context: Context): RuleConfiguratorComponents =
      new RuleConfiguratorComponents(context: Context) {
        override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth
        override lazy val eventConfigurationRepository: EventConfigurationRepository = eventRepo
        override lazy val aggregationRuleConfigurationRepository: AggregationRuleConfigurationRepository =
          aggregationRepo
        override lazy val achievementConfigurationRepository: AchievementConfigurationRepository = repo
        // do not initialise a real Kafka service/connection for event configurations in these tests
        override lazy val kafkaEventConfigurationPublicationService: KafkaPublicationService[
          eventconfigurations.EventConfigurationKey,
          eventconfigurations.EventConfiguration] = mock[
          KafkaPublicationService[eventconfigurations.EventConfigurationKey, eventconfigurations.EventConfiguration]]
        // do not initialise a real Kafka service/connection for aggregation configurations in these tests
        override lazy val kafkaAggregationRuleConfigurationPublicationService: KafkaPublicationService[
          aggregation.AggregationRuleConfigurationKey,
          aggregation.AggregationRuleConfiguration] = mock[KafkaPublicationService[
          aggregation.AggregationRuleConfigurationKey,
          aggregation.AggregationRuleConfiguration]]
        override lazy val kafkaAchievementRuleConfigurationPublicationService
            : KafkaPublicationService[dataapi.AchievementConfigurationKey, dataapi.AchievementConfiguration] =
          kafkaService
        override lazy val achievementRuleIdProvider: AchievementRuleIdProvider = () => ruleId
      }
  }.build()

  private val token = BearerToken("some-jwt")
  private val headersWithFakeJwt = defaultHeaders.add(HeaderNames.AUTHORIZATION -> s"Bearer ${token.rawValue}")
  private val eventDbId = EventConfigurationId(0)
  private val aggregationDbId = AggregationRuleConfigurationId(0)
  private val ruleId = AchievementConfigurationRuleId.random()
  private val ruleDbId = AchievementConfigurationId(0)
  private val achievementEventDbId = AchievementEventConfigurationId(0)
  private val achievementWebhookDbId = AchievementWebhookConfigurationId(0)
  private val primaryProjectId = SampleObjectFactory.primaryProjectId
  private val successfulKafkaResponse = EitherT[Future, EventSubmissionError, KafkaPublicationInfo](
    Future.successful(Right(KafkaPublicationInfo("topic", 1, 1, OffsetDateTime.now.toEpochSecond))))
  private val dateTime = OffsetDateTimeUtils.nowUtc()
  private val updateResult: Future[Int] = Future.successful(0)

  "createAchievementConfiguration" should {
    "publish an achievement configuration with event action" in {
      forAll(achievementRuleConfigGen.filter(_.isActive), allowedProjectIdGen) {
        case (baseAchievementConfig, projectId) =>
          forAll(achievementEventActionPayloadGen(baseAchievementConfig.getConditionAggregationRuleIds)) {
            actionPayload =>
              val achievementConfig = baseAchievementConfig.copy(action = AchievementAction(actionPayload))
              val eventConfig = eventConfigGen.getOne.copy(
                eventId = actionPayload.eventId,
                fields = actionPayload.setFields.map(field => EventField(field.fieldName, FieldValueType.String)))
              checkWritePermissionIsExpected()
              val keyCapture = CaptureOne[dataapi.AchievementConfigurationKey]()
              val configCapture = CaptureOne[Option[dataapi.AchievementConfiguration]]()
              val createRequest = createAchievementConfigurationRequest(achievementConfig)
              val aggregationRuleIdToIdMap =
                createRequest.conditions
                  .map(_.aggregationRuleId -> AggregationRuleConfigurationId(Random.nextLong()))
                  .toMap
              (repo
                .checkIfAchievementRuleConfigurationExists(_: String, _: ProjectId)(_: ExecutionContext))
                .expects(createRequest.achievementName, projectId, *)
                .returning(Future.successful(false))
                .once()
              (eventRepo
                .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
                .expects(eventConfig.eventId, projectId, *)
                .returning(Future.successful(Some(toEventConfigurationEntity(eventConfig, projectId))))
                .once()
              (aggregationRepo
                .getAggregationRuleConfigurationIds(_: List[AggregationRuleConfigurationRuleId], _: ProjectId)(
                  _: ExecutionContext))
                .expects(createRequest.getConditionAggregationRuleIds, projectId, *)
                .returning(Future.successful(aggregationRuleIdToIdMap))
              (repo
                .createAchievementConfigurationWithEvent(
                  _: ProjectId,
                  _: AchievementConfigurationRuleId,
                  _: EventConfigurationId,
                  _: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
                  _: String,
                  _: String,
                  _: AchievementTriggerBehaviour,
                  _: AchievementEventActionPayload,
                  _: List[AchievementCondition])(_: ExecutionContext))
                .expects(
                  projectId,
                  ruleId,
                  eventDbId,
                  aggregationRuleIdToIdMap,
                  createRequest.achievementName,
                  createRequest.description,
                  baseAchievementConfig.triggerBehaviour,
                  actionPayload,
                  createRequest.conditions,
                  *)
                .returning(Future.successful(toAchievementConfigurationEntity(achievementConfig, projectId)))
                .once()
              (kafkaService
                .publish(_: dataapi.AchievementConfigurationKey, _: Option[dataapi.AchievementConfiguration])(
                  _: ExecutionContext))
                .expects(capture(keyCapture), capture(configCapture), *)
                .returning(successfulKafkaResponse)
                .once()

              val requestPayload =
                CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
                  createRequest)
              val request =
                FakeRequest(
                  POST,
                  testAchievementRulesEndpointPath(projectId),
                  headersWithFakeJwt,
                  AnyContentAsJson(requestPayload))

              // WHEN: we send a create request and a mock repository returns a "created" entity
              val result = route(app, request).value

              // THEN: the request should succeed and Kafka publisher should be called
              status(result) mustBe CREATED
              keyCapture.value.getAchievementRuleId mustBe ruleId.toString
              keyCapture.value.getProjectId mustBe projectId.toString
              verifyConfigSentToKafka(configCapture, achievementConfig)
          }
      }
    }

    "publish an achievement configuration with webhook action with event config" in {
      forAll(achievementRuleConfigGen.filter(_.isActive), allowedProjectIdGen) {
        case (baseAchievementConfig, projectId) =>
          val aggregationRuleIds = baseAchievementConfig.getConditionAggregationRuleIds
          forAll(
            achievementWebhookActionPayloadGen(aggregationRuleIds),
            webhookActionEventConfigGen(aggregationRuleIds)) { (baseActionPayload, webhookEventConfig) =>
            val actionPayload = baseActionPayload.copy(eventConfig = Some(webhookEventConfig))
            val achievementConfig = baseAchievementConfig.copy(action = AchievementAction(actionPayload))
            val eventConfig = eventConfigGen.getOne.copy(
              eventId = webhookEventConfig.eventId,
              fields = webhookEventConfig.setFields.map(field => EventField(field.fieldName, FieldValueType.String)))
            checkWritePermissionIsExpected()
            val keyCapture = CaptureOne[dataapi.AchievementConfigurationKey]()
            val configCapture = CaptureOne[Option[dataapi.AchievementConfiguration]]()
            val createRequest = createAchievementConfigurationRequest(achievementConfig)
            val aggregationRuleIdToIdMap =
              createRequest.conditions
                .map(_.aggregationRuleId -> AggregationRuleConfigurationId(Random.nextLong()))
                .toMap
            (repo
              .checkIfAchievementRuleConfigurationExists(_: String, _: ProjectId)(_: ExecutionContext))
              .expects(createRequest.achievementName, projectId, *)
              .returning(Future.successful(false))
              .once()
            (eventRepo
              .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
              .expects(eventConfig.eventId, projectId, *)
              .returning(Future.successful(Some(toEventConfigurationEntity(eventConfig, projectId))))
              .once()
            (aggregationRepo
              .getAggregationRuleConfigurationIds(_: List[AggregationRuleConfigurationRuleId], _: ProjectId)(
                _: ExecutionContext))
              .expects(createRequest.getConditionAggregationRuleIds, projectId, *)
              .returning(Future.successful(aggregationRuleIdToIdMap))
            (repo
              .createAchievementConfigurationWithWebhook(
                _: ProjectId,
                _: AchievementConfigurationRuleId,
                _: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
                _: String,
                _: String,
                _: AchievementTriggerBehaviour,
                _: CreateAchievementWebhookActionDetails,
                _: List[AchievementCondition])(_: ExecutionContext))
              .expects(
                projectId,
                ruleId,
                aggregationRuleIdToIdMap,
                createRequest.achievementName,
                createRequest.description,
                baseAchievementConfig.triggerBehaviour,
                CreateAchievementWebhookActionDetails(
                  actionPayload.requestType,
                  actionPayload.targetUrl,
                  Some(
                    CreateWebhookActionEventConfig(
                      eventDbId,
                      webhookEventConfig.eventId,
                      webhookEventConfig.setFields))),
                createRequest.conditions,
                *)
              .returning(Future.successful(toAchievementConfigurationEntity(achievementConfig, projectId)))
              .once()
            (kafkaService
              .publish(_: dataapi.AchievementConfigurationKey, _: Option[dataapi.AchievementConfiguration])(
                _: ExecutionContext))
              .expects(capture(keyCapture), capture(configCapture), *)
              .returning(successfulKafkaResponse)
              .once()

            val requestPayload =
              CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
                createRequest)
            val request =
              FakeRequest(
                POST,
                testAchievementRulesEndpointPath(projectId),
                headersWithFakeJwt,
                AnyContentAsJson(requestPayload))

            // WHEN: we send a create request and a mock repository returns a "created" entity
            val result = route(app, request).value

            // THEN: the request should succeed and Kafka publisher should be called
            status(result) mustBe CREATED
            keyCapture.value.getAchievementRuleId mustBe ruleId.toString
            keyCapture.value.getProjectId mustBe projectId.toString
            verifyConfigSentToKafka(configCapture, achievementConfig)
          }
      }
    }

    "publish an achievement configuration with webhook action without event config" in {
      forAll(achievementRuleConfigGen.filter(_.isActive), allowedProjectIdGen) {
        case (baseAchievementConfig, projectId) =>
          forAll(achievementWebhookActionPayloadGen(baseAchievementConfig.getConditionAggregationRuleIds)) {
            baseActionPayload =>
              val actionPayload = baseActionPayload.copy(eventConfig = None)
              val achievementConfig = baseAchievementConfig.copy(action = AchievementAction(actionPayload))
              checkWritePermissionIsExpected()
              val keyCapture = CaptureOne[dataapi.AchievementConfigurationKey]()
              val configCapture = CaptureOne[Option[dataapi.AchievementConfiguration]]()
              val createRequest = createAchievementConfigurationRequest(achievementConfig)
              val aggregationRuleIdToIdMap =
                createRequest.conditions
                  .map(_.aggregationRuleId -> AggregationRuleConfigurationId(Random.nextLong()))
                  .toMap
              (repo
                .checkIfAchievementRuleConfigurationExists(_: String, _: ProjectId)(_: ExecutionContext))
                .expects(createRequest.achievementName, projectId, *)
                .returning(Future.successful(false))
                .once()
              (aggregationRepo
                .getAggregationRuleConfigurationIds(_: List[AggregationRuleConfigurationRuleId], _: ProjectId)(
                  _: ExecutionContext))
                .expects(createRequest.getConditionAggregationRuleIds, projectId, *)
                .returning(Future.successful(aggregationRuleIdToIdMap))
              (repo
                .createAchievementConfigurationWithWebhook(
                  _: ProjectId,
                  _: AchievementConfigurationRuleId,
                  _: Map[AggregationRuleConfigurationRuleId, AggregationRuleConfigurationId],
                  _: String,
                  _: String,
                  _: AchievementTriggerBehaviour,
                  _: CreateAchievementWebhookActionDetails,
                  _: List[AchievementCondition])(_: ExecutionContext))
                .expects(
                  projectId,
                  ruleId,
                  aggregationRuleIdToIdMap,
                  createRequest.achievementName,
                  createRequest.description,
                  baseAchievementConfig.triggerBehaviour,
                  CreateAchievementWebhookActionDetails(
                    actionPayload.requestType,
                    actionPayload.targetUrl,
                    eventConfig = None),
                  createRequest.conditions,
                  *)
                .returning(Future.successful(toAchievementConfigurationEntity(achievementConfig, projectId)))
                .once()
              (kafkaService
                .publish(_: dataapi.AchievementConfigurationKey, _: Option[dataapi.AchievementConfiguration])(
                  _: ExecutionContext))
                .expects(capture(keyCapture), capture(configCapture), *)
                .returning(successfulKafkaResponse)
                .once()

              val requestPayload =
                CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
                  createRequest)
              val request =
                FakeRequest(
                  POST,
                  testAchievementRulesEndpointPath(projectId),
                  headersWithFakeJwt,
                  AnyContentAsJson(requestPayload))

              // WHEN: we send a create request
              val result = route(app, request).value

              // THEN: the request should succeed and Kafka publisher should be called
              status(result) mustBe CREATED
              keyCapture.value.getAchievementRuleId mustBe ruleId.toString
              keyCapture.value.getProjectId mustBe projectId.toString
              verifyConfigSentToKafka(configCapture, achievementConfig)
          }
      }
    }
  }

  "activating achievement configuration" should {
    "publish an achievement configuration when achievement configuration was inactive" in {
      forAll(achievementRuleConfigGen.filterNot(_.isActive), allowedProjectIdGen) {
        case (achievementConfig, projectId) =>
          checkWritePermissionIsExpected()
          val keyCapture = CaptureOne[dataapi.AchievementConfigurationKey]()
          val configCapture = CaptureOne[Option[dataapi.AchievementConfiguration]]()
          (repo
            .getAchievementConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(Some(toAchievementConfigurationEntity(achievementConfig, projectId))))
            .once()
          (repo
            .updateAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId, _: Boolean, _: String))
            .expects(ruleId, projectId, true, achievementConfig.description)
            .returning(updateResult)
            .once()
          (repo
            .getAchievementConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(
              Some(toAchievementConfigurationEntity(achievementConfig.copy(isActive = true), projectId))))
            .once()
          (kafkaService
            .publish(_: dataapi.AchievementConfigurationKey, _: Option[dataapi.AchievementConfiguration])(
              _: ExecutionContext))
            .expects(capture(keyCapture), capture(configCapture), *)
            .returning(successfulKafkaResponse)
            .once()

          val request =
            FakeRequest(
              PATCH,
              testAchievementRuleEndpointPath(projectId, ruleId),
              headersWithFakeJwt,
              AnyContentAsJson(activateAchievementRuleConfigurationRequestJson))
          val result = route(app, request).value

          status(result) mustBe OK
          keyCapture.value.getAchievementRuleId mustBe ruleId.toString
          keyCapture.value.getProjectId mustBe projectId.toString
          verifyConfigSentToKafka(configCapture, achievementConfig)
      }
    }

    "don't publish anything when the specified values are the same as in the stored entity" in {
      forAll(achievementRuleConfigGen.filter(_.isActive), allowedProjectIdGen) { case (achievementConfig, projectId) =>
        checkWritePermissionIsExpected()
        (repo
          .getAchievementConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, projectId, *)
          .returning(Future.successful(Some(toAchievementConfigurationEntity(achievementConfig, projectId))))
          .once()
        (kafkaService
          .publish(_: dataapi.AchievementConfigurationKey, _: Option[dataapi.AchievementConfiguration])(
            _: ExecutionContext))
          .expects(*, *, *)
          .never()

        val request =
          FakeRequest(
            PATCH,
            testAchievementRuleEndpointPath(projectId, ruleId),
            headersWithFakeJwt,
            AnyContentAsJson(
              UpdateAchievementRuleConfigurationRequest.updateAchievementRuleConfigurationRequestPlayFormat.writes(
                activateAchievementRuleConfigurationRequest.copy(description = Some(achievementConfig.description)))))
        val result = route(app, request).value

        status(result) mustBe OK
      }
    }
  }

  "deactivating achievement configuration" should {
    "publish an achievement configuration as deleted when achievement configuration was active" in {
      forAll(achievementRuleConfigGen.filter(_.isActive), allowedProjectIdGen) { case (achievementConfig, projectId) =>
        checkWritePermissionIsExpected()
        val keyCapture = CaptureOne[dataapi.AchievementConfigurationKey]()
        val configCapture = CaptureOne[Option[dataapi.AchievementConfiguration]]()
        (repo
          .getAchievementConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, projectId, *)
          .returning(Future.successful(Some(toAchievementConfigurationEntity(achievementConfig, projectId))))
          .once()
        (repo
          .updateAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId, _: Boolean, _: String))
          .expects(ruleId, projectId, false, achievementConfig.description)
          .returning(updateResult)
          .once()
        (repo
          .getAchievementConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, projectId, *)
          .returning(Future.successful(
            Some(toAchievementConfigurationEntity(achievementConfig.copy(isActive = false), projectId))))
          .once()
        (kafkaService
          .publish(_: dataapi.AchievementConfigurationKey, _: Option[dataapi.AchievementConfiguration])(
            _: ExecutionContext))
          .expects(capture(keyCapture), capture(configCapture), *)
          .returning(successfulKafkaResponse)
          .once()

        val request =
          FakeRequest(
            PATCH,
            testAchievementRuleEndpointPath(projectId, ruleId),
            headersWithFakeJwt,
            AnyContentAsJson(deactivateAchievementRuleConfigurationRequestJson))
        val result = route(app, request).value

        status(result) mustBe OK
        keyCapture.value.getAchievementRuleId mustBe ruleId.toString
        keyCapture.value.getProjectId mustBe projectId.toString
        configCapture.value mustBe None
      }
    }

    "don't publish anything when achievement configuration was already inactive" in {
      val updateRequest =
        UpdateAchievementRuleConfigurationRequest(
          isActive = Some(false),
          description = Some("We are the ones who make a brighter day, so let's start giving"))
      val updateRequestJson =
        UpdateAchievementRuleConfigurationRequest.updateAchievementRuleConfigurationRequestPlayFormat.writes(
          updateRequest)
      forAll(achievementRuleConfigGen.filterNot(_.isActive)) { achievementConfig =>
        checkWritePermissionIsExpected()
        (repo
          .getAchievementConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, primaryProjectId, *)
          .returning(Future.successful(Some(toAchievementConfigurationEntity(achievementConfig, primaryProjectId))))
          .once()
        (repo
          .updateAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId, _: Boolean, _: String))
          .expects(ruleId, primaryProjectId, updateRequest.isActive.value, updateRequest.description.value)
          .returning(updateResult)
          .once()
        (repo
          .getAchievementConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, primaryProjectId, *)
          .returning(Future.successful(Some(toAchievementConfigurationEntity(
            achievementConfig.copy(description = updateRequest.description.value),
            primaryProjectId))))
          .once()
        (kafkaService
          .publish(_: dataapi.AchievementConfigurationKey, _: Option[dataapi.AchievementConfiguration])(
            _: ExecutionContext))
          .expects(*, *, *)
          .never()

        val request =
          FakeRequest(
            PATCH,
            testAchievementRuleEndpointPath(primaryProjectId, ruleId),
            headersWithFakeJwt,
            AnyContentAsJson(updateRequestJson))
        val result = route(app, request).value

        status(result) mustBe OK
      }
    }
  }

  "deleteAchievementConfiguration" should {
    "don't publish an achievement when deleting inactive achievement configuration" in {
      forAll(achievementRuleConfigGen.filterNot(_.isActive), allowedProjectIdGen) {
        case (achievementConfig, projectId) =>
          checkWritePermissionIsExpected()
          (repo
            .getAchievementConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(Some(toAchievementConfigurationEntity(achievementConfig, projectId))))
            .once()
          val (achievementEventConfigurationId, achievementWebhookConfigurationId) =
            achievementConfig.action.payload match {
              case _: AchievementEventActionPayload   => (Some(achievementEventDbId), None)
              case p: AchievementWebhookActionPayload => (None, p.eventConfig.map(_ => achievementWebhookDbId))
            }
          (repo
            .delete(
              _: AchievementConfigurationId,
              _: Option[AchievementEventConfigurationId],
              _: Option[AchievementWebhookConfigurationId])(_: ExecutionContext))
            .expects(ruleDbId, achievementEventConfigurationId, achievementWebhookConfigurationId, *)
            .returning(Future.successful(()))
            .once()
          (kafkaService
            .publish(_: dataapi.AchievementConfigurationKey, _: Option[dataapi.AchievementConfiguration])(
              _: ExecutionContext))
            .expects(*, *, *)
            .never()

          val request =
            FakeRequest(DELETE, testAchievementRuleEndpointPath(projectId, ruleId)).withHeaders(headersWithFakeJwt)
          val result = route(app, request).value

          status(result) mustBe NO_CONTENT
      }
    }
  }

  private def createAchievementConfigurationRequest(config: AchievementRuleConfiguration) =
    CreateAchievementRuleConfigurationRequest(
      achievementName = config.achievementName,
      description = config.description,
      triggerBehaviour = Some(config.triggerBehaviour),
      action = config.action,
      conditions = config.conditions)

  protected def checkExpectedPermission(permission: Permission): Unit = {
    val _ = (jwtAuth
      .verify(_: BearerToken, _: Seq[Permission])(_: ExecutionContext))
      .expects(token, List(permission), *)
      .returning(testAuthContextToReturn)
      .once()
  }

  private def toAchievementConfigurationEntity(
      config: AchievementRuleConfiguration,
      projectId: ProjectId): AchievementConfigurationEntity = {
    val (
      achievementEventConfigurationId,
      achievementEventConfiguration,
      achievementWebhookConfigurationId,
      achievementWebhookConfiguration) = config.action.payload match {
      case p: AchievementEventActionPayload =>
        val achievementEventConfiguration =
          AchievementEventConfigurationEntity(
            id = achievementEventDbId,
            eventConfigurationId = eventDbId,
            eventConfigurationEventId = p.eventId,
            fields = p.setFields.map(field =>
              AchievementEventConfigurationFieldEntity(
                id = AchievementEventConfigurationFieldId(0),
                achievementEventConfigurationId = achievementEventDbId,
                fieldName = field.fieldName,
                operationType = field.operation,
                aggregationRuleId = field.aggregationRuleId,
                value = field.value,
                createAt = OffsetDateTime.now(),
                updatedAt = OffsetDateTime.now())),
            createdAt = OffsetDateTime.now(),
            updatedAt = OffsetDateTime.now())
        (Some(achievementEventDbId), Some(achievementEventConfiguration), None, None)
      case p: AchievementWebhookActionPayload =>
        val achievementWebhookConfigurationId = p.eventConfig.map(_ => achievementWebhookDbId)
        val achievementWebhookConfiguration =
          AchievementWebhookConfigurationEntity(
            id = achievementWebhookDbId,
            eventConfigurationId = Some(eventDbId),
            eventConfigurationEventId = p.eventConfig.map(_.eventId),
            requestType = p.requestType,
            url = p.targetUrl,
            fields = p.eventConfig
              .map(_.setFields.map(field =>
                AchievementWebhookConfigurationFieldEntity(
                  id = AchievementWebhookConfigurationFieldId(0),
                  achievementWebhookConfigurationId = achievementWebhookDbId,
                  fieldName = field.fieldName,
                  operationType = field.operation,
                  aggregationRuleId = field.aggregationRuleId,
                  value = field.value,
                  createAt = OffsetDateTime.now(),
                  updatedAt = OffsetDateTime.now())))
              .getOrElse(Nil),
            createdAt = OffsetDateTime.now(),
            updatedAt = OffsetDateTime.now())
        (None, None, achievementWebhookConfigurationId, Some(achievementWebhookConfiguration))
    }

    achievement.AchievementConfigurationEntity(
      id = ruleDbId,
      ruleId = ruleId,
      projectId = projectId,
      name = config.achievementName,
      description = config.description,
      triggerBehaviour = config.triggerBehaviour,
      actionType = config.action.actionType,
      achievementEventConfigurationId = achievementEventConfigurationId,
      achievementEventConfiguration = achievementEventConfiguration,
      achievementWebhookConfigurationId = achievementWebhookConfigurationId,
      achievementWebhookConfiguration = achievementWebhookConfiguration,
      conditions = config.conditions.map(condition =>
        AchievementConditionEntity(
          id = AchievementConditionId(0),
          achievementConfigurationId = AchievementConfigurationId(0),
          aggregationRuleConfigurationId = aggregationDbId,
          aggregationRuleConfigurationRuleId = condition.aggregationRuleId,
          aggregationField = condition.aggregationField,
          conditionType = condition.conditionType,
          value = condition.value,
          createdAt = OffsetDateTime.now(),
          updatedAt = OffsetDateTime.now())),
      isActive = config.isActive,
      createdAt = config.createdAt,
      updatedAt = config.updatedAt)
  }

  private def toEventConfigurationEntity(
      eventConfig: EventConfiguration,
      projectId: ProjectId): EventConfigurationEntity =
    EventConfigurationEntity(
      eventDbId,
      eventConfig.eventId,
      projectId,
      eventConfig.name,
      eventConfig.description,
      eventConfig.fields.zipWithIndex.map { case (field, i) =>
        EventFieldEntity(EventFieldId(i), eventDbId, field.name, field.valueType)
      },
      isActive = eventConfig.isActive,
      dateTime,
      dateTime)

  private def verifyConfigSentToKafka(
      configCapture: CaptureOne[Option[dataapi.AchievementConfiguration]],
      achievementRuleConfiguration: AchievementRuleConfiguration): Unit = {
    inside(configCapture.value) { case Some(config) =>
      config.getName mustBe achievementRuleConfiguration.achievementName
      config.getActionType mustBe achievementRuleConfiguration.action.actionType.toDataApi
      achievementRuleConfiguration.action.payload match {
        case p: AchievementEventActionPayload =>
          verifyConfigWithEventSentToKafka(config, p)
        case p: AchievementWebhookActionPayload =>
          verifyConfigWithWebhookSentToKafka(config, p)
      }
      config.getConditions.asScala.zip(achievementRuleConfiguration.conditions).foreach {
        case (dataapiCondition, condition) =>
          dataapiCondition.getAggregationRuleId mustBe condition.aggregationRuleId.toString
          dataapiCondition.getAggregationField mustBe condition.aggregationField
          dataapiCondition.getConditionType.name() mustBe condition.conditionType.entryName
          dataapiCondition.getValue mustBe condition.value.orNull
      }
    }
  }

  private def verifyConfigWithEventSentToKafka(
      config: AchievementConfiguration,
      payload: AchievementEventActionPayload): Unit = {
    config.getWebhookConfiguration mustBe nullValue
    config.getEventConfiguration.getEventId mustBe payload.eventId.toString
    config.getEventConfiguration.getFields.asScala.zip(payload.setFields).foreach { case (dataapiField, field) =>
      dataapiField.getFieldName mustBe field.fieldName
      dataapiField.getOperationType mustBe field.operation.toDataApi
      dataapiField.getValue mustBe field.value
    }
  }

  private def verifyConfigWithWebhookSentToKafka(
      config: AchievementConfiguration,
      payload: AchievementWebhookActionPayload) = {
    config.getEventConfiguration mustBe nullValue
    val webhookConfig = config.getWebhookConfiguration
    webhookConfig.getRequestType mustBe payload.requestType.toDataApiRequestType
    webhookConfig.getUrl mustBe payload.targetUrl
    payload.eventConfig match {
      case Some(eventConfig) =>
        webhookConfig.getWebhookEventConfiguration.getEventId mustBe eventConfig.eventId.toString
        webhookConfig.getWebhookEventConfiguration.getFields.asScala.zip(eventConfig.setFields).foreach {
          case (dataapiField, field) =>
            dataapiField.getFieldName mustBe field.fieldName
            dataapiField.getOperationType mustBe field.operation.toDataApi
            dataapiField.getValue mustBe field.value
        }
      case None => webhookConfig.getWebhookEventConfiguration mustBe nullValue
    }
  }
}
