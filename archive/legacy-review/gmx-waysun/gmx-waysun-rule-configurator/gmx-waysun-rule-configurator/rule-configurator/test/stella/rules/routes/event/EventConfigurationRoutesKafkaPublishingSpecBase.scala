package stella.rules.routes.event

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

import cats.data.EitherT
import org.scalacheck.Gen
import org.scalamock.matchers.ArgCapture.CaptureOne
import org.scalamock.scalatest.MockFactory
import org.scalatest.OptionValues
import org.scalatestplus.play.BaseOneAppPerTest
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
import stella.common.models.Ids.ProjectId
import stella.dataapi.achievement
import stella.dataapi.aggregation
import stella.dataapi.{eventconfigurations => dataapi}

import stella.rules.RuleConfiguratorComponents
import stella.rules.db.achievement.AchievementConfigurationRepository
import stella.rules.db.aggregation.AggregationRuleConfigurationRepository
import stella.rules.db.event.EventConfigurationRepository
import stella.rules.gen.Generators.eventConfigGen
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.Ids.EventConfigurationId
import stella.rules.models.Ids.EventFieldId
import stella.rules.models.event.EventConfigurationEntity
import stella.rules.models.event.EventFieldEntity
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.UpdateEventConfigurationRequest
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestRuleConfiguratorAppBuilder
import stella.rules.services.EventIdProvider

abstract class EventConfigurationRoutesKafkaPublishingSpecBase
    extends PlaySpec
    with BaseOneAppPerTest
    with FakeApplicationFactory
    with MockFactory
    with ScalaCheckDrivenPropertyChecks
    with OptionValues {

  protected val allowedProjectIdGen: Gen[ProjectId]
  protected val testAuthContextToReturn: EitherT[Future, JwtAuthorizationError, StellaAuthContext] =
    EitherT[Future, JwtAuthorizationError, StellaAuthContext](Future.successful(Right(testAuthContext)))

  private val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]
  private val kafkaService: KafkaPublicationService[dataapi.EventConfigurationKey, dataapi.EventConfiguration] =
    mock[KafkaPublicationService[dataapi.EventConfigurationKey, dataapi.EventConfiguration]]
  private val repo: EventConfigurationRepository = mock[EventConfigurationRepository]
  private val aggregationRepo: AggregationRuleConfigurationRepository = mock[AggregationRuleConfigurationRepository]
  private val achievementRepo: AchievementConfigurationRepository = mock[AchievementConfigurationRepository]

  protected def checkWritePermissionIsExpected(): Unit
  protected def testEventsEndpointPath(projectId: ProjectId): String
  protected def testEventEndpointPath(projectId: ProjectId, eventId: EventConfigurationEventId): String

  override def fakeApplication(): Application = new TestRuleConfiguratorAppBuilder {
    override def createRuleConfiguratorComponents(context: Context): RuleConfiguratorComponents =
      new RuleConfiguratorComponents(context: Context) {
        override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth
        override lazy val eventConfigurationRepository: EventConfigurationRepository = repo
        override lazy val aggregationRuleConfigurationRepository: AggregationRuleConfigurationRepository =
          aggregationRepo
        override lazy val achievementConfigurationRepository: AchievementConfigurationRepository = achievementRepo
        override lazy val kafkaEventConfigurationPublicationService
            : KafkaPublicationService[dataapi.EventConfigurationKey, dataapi.EventConfiguration] = kafkaService
        // do not initialise a real Kafka service/connection for aggregation rule configurations in these tests
        override lazy val kafkaAggregationRuleConfigurationPublicationService: KafkaPublicationService[
          aggregation.AggregationRuleConfigurationKey,
          aggregation.AggregationRuleConfiguration] = mock[KafkaPublicationService[
          aggregation.AggregationRuleConfigurationKey,
          aggregation.AggregationRuleConfiguration]]
        // do not initialise a real Kafka service/connection for achievement configurations in these tests
        override lazy val kafkaAchievementRuleConfigurationPublicationService
            : KafkaPublicationService[achievement.AchievementConfigurationKey, achievement.AchievementConfiguration] =
          mock[KafkaPublicationService[achievement.AchievementConfigurationKey, achievement.AchievementConfiguration]]
        override lazy val eventIdProvider: EventIdProvider = () => eventId
      }
  }.build()

  private val token = BearerToken("some-jwt")
  private val headersWithFakeJwt = defaultHeaders.add(HeaderNames.AUTHORIZATION -> s"Bearer ${token.rawValue}")
  private val eventConfigurationDbId = EventConfigurationId(0)
  private val eventId = EventConfigurationEventId.random()
  private val successfulKafkaResponse = EitherT[Future, EventSubmissionError, KafkaPublicationInfo](
    Future.successful(Right(KafkaPublicationInfo("topic", 1, 1, OffsetDateTime.now.toEpochSecond))))
  private val dateTime = OffsetDateTimeUtils.nowUtc()
  private val updateResult: Future[Int] = Future.successful(0)

  "create event configuration" should {
    "publish an event configuration" in {
      forAll(eventConfigGen.filter(_.isActive), allowedProjectIdGen) { (eventConfig, projectId) =>
        checkWritePermissionIsExpected()
        val keyCapture = CaptureOne[dataapi.EventConfigurationKey]()
        val configCapture = CaptureOne[Option[dataapi.EventConfiguration]]()
        val createRequest = createEventConfigurationRequest(eventConfig)
        (repo
          .checkIfEventConfigurationExists(_: String, _: ProjectId)(_: ExecutionContext))
          .expects(createRequest.name, projectId, *)
          .returning(Future.successful(false))
          .once()
        (repo
          .createEventConfigurationAndFields(
            _: EventConfigurationEventId,
            _: ProjectId,
            _: CreateEventConfigurationRequest)(_: ExecutionContext))
          .expects(eventId, projectId, createRequest, *)
          .returning(Future.successful(toEventConfigurationEntity(projectId, eventConfig)))
          .once()
        (kafkaService
          .publish(_: dataapi.EventConfigurationKey, _: Option[dataapi.EventConfiguration])(_: ExecutionContext))
          .expects(capture(keyCapture), capture(configCapture), *)
          .returning(successfulKafkaResponse)
          .once()

        val payloadJson =
          CreateEventConfigurationRequest.createEventConfigurationRequestPlayFormat.writes(createRequest)
        val request =
          FakeRequest(POST, testEventsEndpointPath(projectId), headersWithFakeJwt, AnyContentAsJson(payloadJson))

        // WHEN: we send a create request and a mock repository returns a "created" entity
        val result = route(app, request).value

        // THEN: the request should succeed and Kafka publisher should be called
        status(result) mustBe CREATED
        keyCapture.value.getEventId mustBe eventId.toString
        keyCapture.value.getProjectId mustBe projectId.toString
        keyCapture.value.getName mustBe eventConfig.name
        configCapture.value.value.getFields.asScala mustBe eventConfig.fields.map(_.toDataApi)
      }
    }
  }

  "activating event configuration" should {
    "publish an event configuration when event configuration was inactive" in {
      forAll(eventConfigGen.filterNot(_.isActive), allowedProjectIdGen) { (eventConfig, projectId) =>
        checkWritePermissionIsExpected()
        val keyCapture = CaptureOne[dataapi.EventConfigurationKey]()
        val configCapture = CaptureOne[Option[dataapi.EventConfiguration]]()
        (repo
          .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(Future.successful(Some(toEventConfigurationEntity(projectId, eventConfig))))
          .once()
        (repo
          .updateEventConfiguration(_: EventConfigurationEventId, _: ProjectId, _: Boolean, _: String))
          .expects(
            eventId,
            projectId,
            activateEventConfigurationRequest.isActive.value,
            activateEventConfigurationRequest.description.getOrElse[String](eventConfig.description))
          .returning(updateResult)
          .once()
        (repo
          .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(Future.successful(Some(toEventConfigurationEntity(projectId, eventConfig.copy(isActive = true)))))
          .once()
        (kafkaService
          .publish(_: dataapi.EventConfigurationKey, _: Option[dataapi.EventConfiguration])(_: ExecutionContext))
          .expects(capture(keyCapture), capture(configCapture), *)
          .returning(successfulKafkaResponse)
          .once()

        val request =
          FakeRequest(
            PATCH,
            testEventEndpointPath(projectId, eventId),
            headersWithFakeJwt,
            AnyContentAsJson(activateEventConfigurationRequestJson))
        val result = route(app, request).value

        status(result) mustBe OK
        keyCapture.value.getEventId mustBe eventId.toString
        keyCapture.value.getProjectId mustBe projectId.toString
        keyCapture.value.getName mustBe eventConfig.name
        configCapture.value.value.getFields.asScala mustBe eventConfig.fields.map(_.toDataApi)
      }
    }

    "don't publish anything when the specified values are the same as in the stored entity" in {
      forAll(eventConfigGen.filter(_.isActive), allowedProjectIdGen) { (eventConfig, projectId) =>
        checkWritePermissionIsExpected()
        (repo
          .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(Future.successful(Some(toEventConfigurationEntity(projectId, eventConfig))))
          .once()
        (kafkaService
          .publish(_: dataapi.EventConfigurationKey, _: Option[dataapi.EventConfiguration])(_: ExecutionContext))
          .expects(*, *, *)
          .never()

        val request =
          FakeRequest(
            PATCH,
            testEventEndpointPath(projectId, eventId),
            headersWithFakeJwt,
            AnyContentAsJson(
              UpdateEventConfigurationRequest.updateEventConfigurationRequestPlayFormat.writes(
                activateEventConfigurationRequest.copy(description = Some(eventConfig.description)))))
        val result = route(app, request).value

        status(result) mustBe OK
      }
    }
  }

  "deactivating event configuration" should {
    "publish an event configuration as deleted when event configuration was active" in {
      forAll(eventConfigGen.filter(_.isActive), allowedProjectIdGen) { (eventConfig, projectId) =>
        checkWritePermissionIsExpected()
        val keyCapture = CaptureOne[dataapi.EventConfigurationKey]()
        val configCapture = CaptureOne[Option[dataapi.EventConfiguration]]()
        (repo
          .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(Future.successful(Some(toEventConfigurationEntity(projectId, eventConfig))))
          .once()
        (repo
          .updateEventConfiguration(_: EventConfigurationEventId, _: ProjectId, _: Boolean, _: String))
          .expects(eventId, projectId, deactivateEventConfigurationRequest.isActive.value, eventConfig.description)
          .returning(updateResult)
          .once()
        (repo
          .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(Future.successful(Some(toEventConfigurationEntity(projectId, eventConfig.copy(isActive = false)))))
          .once()
        (kafkaService
          .publish(_: dataapi.EventConfigurationKey, _: Option[dataapi.EventConfiguration])(_: ExecutionContext))
          .expects(capture(keyCapture), capture(configCapture), *)
          .returning(successfulKafkaResponse)
          .once()

        val request =
          FakeRequest(
            PATCH,
            testEventEndpointPath(projectId, eventId),
            headersWithFakeJwt,
            AnyContentAsJson(deactivateEventConfigurationRequestJson))
        val result = route(app, request).value

        status(result) mustBe OK
        keyCapture.value.getEventId mustBe eventId.toString
        keyCapture.value.getProjectId mustBe projectId.toString
        configCapture.value mustBe None
      }
    }

    "don't publish anything when event configuration was already inactive" in {
      val updateRequest =
        UpdateEventConfigurationRequest(isActive = Some(false), description = Some("other nice description"))
      val updateRequestJson =
        UpdateEventConfigurationRequest.updateEventConfigurationRequestPlayFormat.writes(updateRequest)
      forAll(eventConfigGen.filterNot(_.isActive), allowedProjectIdGen) { (eventConfig, projectId) =>
        checkWritePermissionIsExpected()
        (repo
          .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(Future.successful(Some(toEventConfigurationEntity(projectId, eventConfig))))
          .once()
        (repo
          .updateEventConfiguration(_: EventConfigurationEventId, _: ProjectId, _: Boolean, _: String))
          .expects(eventId, projectId, updateRequest.isActive.value, updateRequest.description.value)
          .returning(updateResult)
          .once()
        (repo
          .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(Future.successful(Some(
            toEventConfigurationEntity(projectId, eventConfig.copy(description = updateRequest.description.value)))))
          .once()
        (kafkaService
          .publish(_: dataapi.EventConfigurationKey, _: Option[dataapi.EventConfiguration])(_: ExecutionContext))
          .expects(*, *, *)
          .never()

        val request =
          FakeRequest(
            PATCH,
            testEventEndpointPath(projectId, eventId),
            headersWithFakeJwt,
            AnyContentAsJson(updateRequestJson))
        val result = route(app, request).value

        status(result) mustBe OK
      }
    }
  }

  "deleting event configuration" should {
    "don't publish an event when deleting inactive event configuration" in {
      forAll(eventConfigGen.filterNot(_.isActive), allowedProjectIdGen) { (eventConfig, projectId) =>
        checkWritePermissionIsExpected()
        val eventConfigurationEntity = toEventConfigurationEntity(projectId, eventConfig)
        (repo
          .getEventConfigurationWithoutFields(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(Future.successful(Some(toEventConfigurationEntity(projectId, eventConfig))))
          .once()
        (aggregationRepo
          .isEventInUse(_: EventConfigurationId)(_: ExecutionContext))
          .expects(eventConfigurationDbId, *)
          .returning(Future.successful(false))
          .once()
        (achievementRepo
          .isEventInUse(_: EventConfigurationId)(_: ExecutionContext))
          .expects(eventConfigurationDbId, *)
          .returning(Future.successful(false))
          .once()
        (repo
          .deleteEventConfigurationAndFields(_: EventConfigurationEntity)(_: ExecutionContext))
          .expects(eventConfigurationEntity, *)
          .returning(Future.successful(()))
          .once()
        (kafkaService
          .publish(_: dataapi.EventConfigurationKey, _: Option[dataapi.EventConfiguration])(_: ExecutionContext))
          .expects(*, *, *)
          .never()

        val request =
          FakeRequest(DELETE, testEventEndpointPath(projectId, eventId)).withHeaders(headersWithFakeJwt)

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

  private def createEventConfigurationRequest(eventConfig: EventConfiguration) =
    CreateEventConfigurationRequest(eventConfig.name, Option(eventConfig.description), eventConfig.fields)

  private def toEventConfigurationEntity(
      projectId: ProjectId,
      eventConfig: EventConfiguration): EventConfigurationEntity =
    EventConfigurationEntity(
      eventConfigurationDbId,
      eventId,
      projectId,
      eventConfig.name,
      eventConfig.description,
      eventConfig.fields.zipWithIndex.map { case (field, i) =>
        EventFieldEntity(EventFieldId(i), eventConfigurationDbId, field.name, field.valueType)
      },
      isActive = eventConfig.isActive,
      dateTime,
      dateTime)
}
