package stella.rules.routes.aggregation

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters.CollectionHasAsScala

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
import stella.dataapi.achievement
import stella.dataapi.aggregation.AggregationRuleConfigurationKey
import stella.dataapi.eventconfigurations
import stella.dataapi.{aggregation => dataapi}

import stella.rules.RuleConfiguratorComponents
import stella.rules.db.achievement.AchievementConfigurationRepository
import stella.rules.db.aggregation.AggregationRuleConfigurationRepository
import stella.rules.db.event.EventConfigurationRepository
import stella.rules.gen.Generators.aggregationRuleConfigGen
import stella.rules.gen.Generators.eventConfigGen
import stella.rules.models.Ids._
import stella.rules.models.aggregation.AggregationRuleConditionEntity
import stella.rules.models.aggregation.AggregationRuleConfigurationEntity
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.models.event.EventConfigurationEntity
import stella.rules.models.event.EventFieldEntity
import stella.rules.models.event.http.EventConfiguration
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestRuleConfiguratorAppBuilder
import stella.rules.services.AggregationRuleIdProvider

trait AggregationRuleConfigurationRoutesKafkaPublishingSpecBase
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
      : KafkaPublicationService[dataapi.AggregationRuleConfigurationKey, dataapi.AggregationRuleConfiguration] =
    mock[KafkaPublicationService[dataapi.AggregationRuleConfigurationKey, dataapi.AggregationRuleConfiguration]]
  private val eventRepo: EventConfigurationRepository = mock[EventConfigurationRepository]
  private val repo: AggregationRuleConfigurationRepository = mock[AggregationRuleConfigurationRepository]
  private val achievementRepo: AchievementConfigurationRepository = mock[AchievementConfigurationRepository]

  protected def checkWritePermissionIsExpected(): Unit
  protected def testAggregationRulesEndpointPath(projectId: ProjectId): String
  protected def testAggregationRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId): String

  override def fakeApplication(): Application = new TestRuleConfiguratorAppBuilder {
    override def createRuleConfiguratorComponents(context: Context): RuleConfiguratorComponents =
      new RuleConfiguratorComponents(context: Context) {
        override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth
        override lazy val eventConfigurationRepository: EventConfigurationRepository = eventRepo
        override lazy val aggregationRuleConfigurationRepository: AggregationRuleConfigurationRepository = repo
        override lazy val achievementConfigurationRepository: AchievementConfigurationRepository = achievementRepo
        // do not initialise a real Kafka service/connection for event configurations in these tests
        override lazy val kafkaEventConfigurationPublicationService: KafkaPublicationService[
          eventconfigurations.EventConfigurationKey,
          eventconfigurations.EventConfiguration] = mock[
          KafkaPublicationService[eventconfigurations.EventConfigurationKey, eventconfigurations.EventConfiguration]]
        // do not initialise a real Kafka service/connection for achievement configurations in these tests
        override lazy val kafkaAchievementRuleConfigurationPublicationService
            : KafkaPublicationService[achievement.AchievementConfigurationKey, achievement.AchievementConfiguration] =
          mock[KafkaPublicationService[achievement.AchievementConfigurationKey, achievement.AchievementConfiguration]]
        override lazy val kafkaAggregationRuleConfigurationPublicationService
            : KafkaPublicationService[dataapi.AggregationRuleConfigurationKey, dataapi.AggregationRuleConfiguration] =
          kafkaService
        override lazy val aggregationRuleIdProvider: AggregationRuleIdProvider = () => ruleId
      }
  }.build()

  private val token = BearerToken("some-jwt")
  private val headersWithFakeJwt = defaultHeaders.add(HeaderNames.AUTHORIZATION -> s"Bearer ${token.rawValue}")
  private val eventDbId = EventConfigurationId(0)
  private val ruleDbId = AggregationRuleConfigurationId(0)
  private val ruleId = AggregationRuleConfigurationRuleId.random()
  private val primaryProjectId = SampleObjectFactory.primaryProjectId
  private val successfulKafkaResponse = EitherT[Future, EventSubmissionError, KafkaPublicationInfo](
    Future.successful(Right(KafkaPublicationInfo("topic", 1, 1, OffsetDateTime.now.toEpochSecond))))
  private val dateTime = OffsetDateTimeUtils.nowUtc()
  private val updateResult: Future[Int] = Future.successful(0)

  "createAggregationRuleConfiguration" should {
    "publish an aggregation rule configuration" in {
      forAll(aggregationRuleConfigGen.filter(_.isActive), allowedProjectIdGen) {
        case (aggregationRuleConfig, projectId) =>
          val eventConfig = eventConfigGen.getOne.copy(eventId = aggregationRuleConfig.eventConfigurationId)
          checkWritePermissionIsExpected()
          val keyCapture = CaptureOne[dataapi.AggregationRuleConfigurationKey]()
          val configCapture = CaptureOne[Option[dataapi.AggregationRuleConfiguration]]()
          val createRequest = createAggregationRuleConfigurationRequest(aggregationRuleConfig)
          (repo
            .checkIfAggregationRuleConfigurationExists(_: String, _: ProjectId)(_: ExecutionContext))
            .expects(createRequest.name, projectId, *)
            .returning(Future.successful(false))
            .once()
          (eventRepo
            .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
            .expects(eventConfig.eventId, projectId, *)
            .returning(Future.successful(Some(toEventConfigurationEntity(projectId, eventConfig))))
            .once()
          (repo
            .createAggregationRuleConfiguration(
              _: ProjectId,
              _: AggregationRuleConfigurationRuleId,
              _: EventConfigurationId,
              _: CreateAggregationRuleConfigurationRequest)(_: ExecutionContext))
            .expects(projectId, ruleId, eventDbId, createRequest, *)
            .returning(Future.successful(toAggregationRuleConfigurationEntity(projectId, aggregationRuleConfig)))
            .once()
          (kafkaService
            .publish(_: dataapi.AggregationRuleConfigurationKey, _: Option[dataapi.AggregationRuleConfiguration])(
              _: ExecutionContext))
            .expects(capture(keyCapture), capture(configCapture), *)
            .returning(successfulKafkaResponse)
            .once()

          val requestPayload =
            CreateAggregationRuleConfigurationRequest.createAggregationRuleConfigurationRequestPlayFormat.writes(
              createRequest)
          val request =
            FakeRequest(
              POST,
              testAggregationRulesEndpointPath(projectId),
              headersWithFakeJwt,
              AnyContentAsJson(requestPayload))

          // WHEN: we send a create request and a mock repository returns a "created" entity
          val result = route(app, request).value

          // THEN: the request should succeed and Kafka publisher should be called
          status(result) mustBe CREATED
          keyCapture.value.getRuleId mustBe ruleId.toString
          keyCapture.value.getProjectId mustBe projectId.toString
          keyCapture.value.getName mustBe aggregationRuleConfig.name
          keyCapture.value.getEventId mustBe aggregationRuleConfig.eventConfigurationId.toString
          verifyConfigSentToKafka(configCapture, aggregationRuleConfig)
      }
    }
  }

  "activating aggregation rule configuration" should {
    "publish an aggregation rule configuration when aggregation rule configuration was inactive" in {
      forAll(aggregationRuleConfigGen.filterNot(_.isActive), allowedProjectIdGen) {
        case (aggregationRuleConfig, projectId) =>
          checkWritePermissionIsExpected()
          val keyCapture = CaptureOne[AggregationRuleConfigurationKey]()
          val configCapture = CaptureOne[Option[dataapi.AggregationRuleConfiguration]]()
          (repo
            .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(Some(toAggregationRuleConfigurationEntity(projectId, aggregationRuleConfig))))
            .once()
          (repo
            .updateAggregationRuleConfiguration(
              _: AggregationRuleConfigurationRuleId,
              _: ProjectId,
              _: Boolean,
              _: String))
            .expects(ruleId, projectId, true, aggregationRuleConfig.description)
            .returning(updateResult)
            .once()
          (repo
            .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(
              Some(toAggregationRuleConfigurationEntity(projectId, aggregationRuleConfig.copy(isActive = true)))))
            .once()
          (kafkaService
            .publish(_: AggregationRuleConfigurationKey, _: Option[dataapi.AggregationRuleConfiguration])(
              _: ExecutionContext))
            .expects(capture(keyCapture), capture(configCapture), *)
            .returning(successfulKafkaResponse)
            .once()

          val request =
            FakeRequest(
              PATCH,
              testAggregationRuleEndpointPath(projectId, ruleId),
              headersWithFakeJwt,
              AnyContentAsJson(activateAggregationRuleConfigurationRequestJson))
          val result = route(app, request).value

          status(result) mustBe OK
          keyCapture.value.getRuleId mustBe ruleId.toString
          keyCapture.value.getProjectId mustBe projectId.toString
          verifyConfigSentToKafka(configCapture, aggregationRuleConfig)
      }
    }

    "don't publish anything when the specified values are the same as in the stored entity" in {
      forAll(aggregationRuleConfigGen.filter(_.isActive), allowedProjectIdGen) {
        case (aggregationRuleConfig, projectId) =>
          checkWritePermissionIsExpected()
          (repo
            .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(Some(toAggregationRuleConfigurationEntity(projectId, aggregationRuleConfig))))
            .once()
          (kafkaService
            .publish(_: dataapi.AggregationRuleConfigurationKey, _: Option[dataapi.AggregationRuleConfiguration])(
              _: ExecutionContext))
            .expects(*, *, *)
            .never()

          val request =
            FakeRequest(
              PATCH,
              testAggregationRuleEndpointPath(projectId, ruleId),
              headersWithFakeJwt,
              AnyContentAsJson(
                UpdateAggregationRuleConfigurationRequest.updateAggregationRuleConfigurationRequestPlayFormat.writes(
                  activateAggregationRuleConfigurationRequest.copy(description =
                    Some(aggregationRuleConfig.description)))))
          val result = route(app, request).value

          status(result) mustBe OK
      }
    }
  }

  "deactivating aggregation rule configuration" should {
    "publish an aggregation rule configuration as deleted when aggregation rule configuration was active" in {
      forAll(aggregationRuleConfigGen.filter(_.isActive), allowedProjectIdGen) {
        case (aggregationRuleConfig, projectId) =>
          checkWritePermissionIsExpected()
          val keyCapture = CaptureOne[dataapi.AggregationRuleConfigurationKey]()
          val configCapture = CaptureOne[Option[dataapi.AggregationRuleConfiguration]]()
          (repo
            .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(Some(toAggregationRuleConfigurationEntity(projectId, aggregationRuleConfig))))
            .once()
          (repo
            .updateAggregationRuleConfiguration(
              _: AggregationRuleConfigurationRuleId,
              _: ProjectId,
              _: Boolean,
              _: String))
            .expects(ruleId, projectId, false, aggregationRuleConfig.description)
            .returning(updateResult)
            .once()
          (repo
            .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(
              Some(toAggregationRuleConfigurationEntity(projectId, aggregationRuleConfig.copy(isActive = false)))))
            .once()
          (kafkaService
            .publish(_: dataapi.AggregationRuleConfigurationKey, _: Option[dataapi.AggregationRuleConfiguration])(
              _: ExecutionContext))
            .expects(capture(keyCapture), capture(configCapture), *)
            .returning(successfulKafkaResponse)
            .once()

          val request =
            FakeRequest(
              PATCH,
              testAggregationRuleEndpointPath(projectId, ruleId),
              headersWithFakeJwt,
              AnyContentAsJson(deactivateAggregationRuleConfigurationRequestJson))
          val result = route(app, request).value

          status(result) mustBe OK
          keyCapture.value.getRuleId mustBe ruleId.toString
          keyCapture.value.getProjectId mustBe projectId.toString
          configCapture.value mustBe None
      }
    }

    "don't publish anything when aggregation rule configuration was already inactive" in {
      val updateRequest =
        UpdateAggregationRuleConfigurationRequest(isActive = Some(false), description = Some("lorem ipsum dolor"))
      val updateRequestJson =
        UpdateAggregationRuleConfigurationRequest.updateAggregationRuleConfigurationRequestPlayFormat.writes(
          updateRequest)
      forAll(aggregationRuleConfigGen.filterNot(_.isActive)) { aggregationRuleConfig =>
        checkWritePermissionIsExpected()
        (repo
          .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, primaryProjectId, *)
          .returning(
            Future.successful(Some(toAggregationRuleConfigurationEntity(primaryProjectId, aggregationRuleConfig))))
          .once()
        (repo
          .updateAggregationRuleConfiguration(
            _: AggregationRuleConfigurationRuleId,
            _: ProjectId,
            _: Boolean,
            _: String))
          .expects(ruleId, primaryProjectId, updateRequest.isActive.value, updateRequest.description.value)
          .returning(updateResult)
          .once()
        (repo
          .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, primaryProjectId, *)
          .returning(Future.successful(Some(toAggregationRuleConfigurationEntity(
            primaryProjectId,
            aggregationRuleConfig.copy(description = updateRequest.description.value)))))
          .once()
        (kafkaService
          .publish(_: dataapi.AggregationRuleConfigurationKey, _: Option[dataapi.AggregationRuleConfiguration])(
            _: ExecutionContext))
          .expects(*, *, *)
          .never()

        val request =
          FakeRequest(
            PATCH,
            testAggregationRuleEndpointPath(primaryProjectId, ruleId),
            headersWithFakeJwt,
            AnyContentAsJson(updateRequestJson))
        val result = route(app, request).value

        status(result) mustBe OK
      }
    }
  }

  "deleteAggregationRuleConfiguration" should {
    "don't publish an aggregationRule when deleting inactive aggregation rule configuration" in {
      forAll(aggregationRuleConfigGen.filterNot(_.isActive), allowedProjectIdGen) {
        case (aggregationRuleConfig, projectId) =>
          checkWritePermissionIsExpected()
          (repo
            .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
            .expects(ruleId, projectId, *)
            .returning(Future.successful(Some(toAggregationRuleConfigurationEntity(projectId, aggregationRuleConfig))))
            .once()
          (repo
            .delete(_: AggregationRuleConfigurationId)(_: ExecutionContext))
            .expects(ruleDbId, *)
            .returning(Future.successful(()))
            .once()
          (achievementRepo
            .isAggregationRuleInUse(_: AggregationRuleConfigurationId)(_: ExecutionContext))
            .expects(ruleDbId, *)
            .returning(Future.successful(false))
            .once()
          (kafkaService
            .publish(_: dataapi.AggregationRuleConfigurationKey, _: Option[dataapi.AggregationRuleConfiguration])(
              _: ExecutionContext))
            .expects(*, *, *)
            .never()

          val request =
            FakeRequest(DELETE, testAggregationRuleEndpointPath(projectId, ruleId)).withHeaders(headersWithFakeJwt)
          val result = route(app, request).value

          status(result) mustBe NO_CONTENT
      }
    }
  }

  protected def checkExpectedPermission(permission: Permission): Unit = {
    val _ = (jwtAuth
      .verify(_: BearerToken, _: Seq[Permission])(_: ExecutionContext))
      .expects(token, List(permission), *)
      .returning(testAuthContextToReturn)
      .once()
  }

  private def createAggregationRuleConfigurationRequest(config: AggregationRuleConfiguration) =
    CreateAggregationRuleConfigurationRequest(
      config.name,
      config.description,
      config.eventConfigurationId,
      config.resetFrequency.toCreateRequestResetFrequency,
      config.aggregationType,
      config.aggregationFieldName,
      config.aggregationGroupByFieldName,
      config.aggregationConditions)

  private def toAggregationRuleConfigurationEntity(
      projectId: ProjectId,
      aggregationRuleConfig: AggregationRuleConfiguration): AggregationRuleConfigurationEntity = {
    val intervalDetails = aggregationRuleConfig.resetFrequency.intervalDetails
    AggregationRuleConfigurationEntity(
      id = ruleDbId,
      ruleId = ruleId,
      projectId = projectId,
      name = aggregationRuleConfig.name,
      description = aggregationRuleConfig.description,
      eventConfigurationId = eventDbId,
      eventConfigurationEventId = aggregationRuleConfig.eventConfigurationId,
      resetFrequencyInterval = aggregationRuleConfig.resetFrequency.interval,
      windowStartDate = aggregationRuleConfig.resetFrequency.windowStartDateUTC,
      resetFrequencyLength = intervalDetails.map(_.length),
      windowCountLimit = intervalDetails.flatMap(_.windowCountLimit),
      aggregationType = aggregationRuleConfig.aggregationType,
      aggregationFieldName = aggregationRuleConfig.aggregationFieldName,
      aggregationGroupByFieldName = aggregationRuleConfig.aggregationGroupByFieldName,
      isActive = aggregationRuleConfig.isActive,
      conditions = aggregationRuleConfig.aggregationConditions.zipWithIndex.map { case (condition, i) =>
        AggregationRuleConditionEntity(
          AggregationRuleConditionId(i),
          ruleDbId,
          condition.eventFieldName,
          condition.conditionType,
          condition.value)
      },
      createdAt = dateTime,
      updatedAt = dateTime)
  }

  private def toEventConfigurationEntity(
      projectId: ProjectId,
      eventConfig: EventConfiguration): EventConfigurationEntity =
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
      configCapture: CaptureOne[Option[dataapi.AggregationRuleConfiguration]],
      aggregationRuleConfig: AggregationRuleConfiguration) = {
    inside(configCapture.value) { case Some(config) =>
      config.getAggregationFieldName mustBe aggregationRuleConfig.aggregationFieldName
      config.getAggregationGroupByFieldName mustBe aggregationRuleConfig.aggregationGroupByFieldName.orNull
      config.getResetFrequency.getIntervalType.name() mustBe aggregationRuleConfig.resetFrequency.interval.entryName
      val intervalDetails = Option(config.getResetFrequency.getIntervalDetails)
      val expectedIntervalDetails =
        aggregationRuleConfig.resetFrequency.intervalDetails.getOrElse(TestIntervalDetails(length = Int.MaxValue))
      config.getAggregationConditions.asScala.zip(aggregationRuleConfig.aggregationConditions).foreach {
        case (dataApiCondition, condition) =>
          dataApiCondition.getEventFieldName mustBe condition.eventFieldName
          dataApiCondition.getConditionType.name() mustBe condition.conditionType.entryName
          dataApiCondition.getValue mustBe condition.value.orNull
      }
      config.getAggregationType.name() mustBe aggregationRuleConfig.aggregationType.entryName
    }
  }
}
