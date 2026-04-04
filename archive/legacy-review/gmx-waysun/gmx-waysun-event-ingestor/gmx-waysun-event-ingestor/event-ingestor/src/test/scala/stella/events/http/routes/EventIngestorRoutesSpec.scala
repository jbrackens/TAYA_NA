package stella.events.http.routes

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.marshalling.ToEntityMarshaller
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.StatusCode
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.ScalatestRouteTest
import cats.data.EitherT
import cats.data.NonEmptyList
import cats.implicits.catsStdInstancesForFuture
import org.scalacheck.Gen
import org.scalamock.scalatest.MockFactory
import org.scalatest.OptionValues
import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpec
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks
import spray.json.JsObject
import spray.json.JsString
import spray.json.RootJsonFormat
import sttp.tapir.server.akkahttp.AkkaHttpServerInterpreter

import stella.common.http.BearerToken
import stella.common.http.Response
import stella.common.http.config.OpenApiConfig
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization._
import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext

import stella.events.EventIngestorBoundedContext
import stella.events.EventIngestorBoundedContext.EventSubmissionError
import stella.events.EventIngestorBoundedContext.UnexpectedEventSubmissionException
import stella.events.gen.Generators._
import stella.events.http.StellaAkkaHttpServerOptions
import stella.events.http.routes.ResponseFormats.errorOutputFormats._
import stella.events.http.routes.json._
import stella.events.utils.SampleObjectFactory

class EventIngestorRoutesSpec
    extends AnyWordSpec
    with ScalatestRouteTest
    with should.Matchers
    with MockFactory
    with ScalaCheckDrivenPropertyChecks
    with OptionValues {
  import EventIngestorRoutesSpec._

  private val submitEventPath = EndpointPath("event_ingestor/event")
  private val submitEventAsSuperAdminPath = EndpointPath("event_ingestor/superadmin/any/event")
  private val submitEventAsAdminPath = EndpointPath("event_ingestor/admin/any/event")
  private val messageOriginDateUTCFieldName = "messageOriginDateUTC"
  private val eventNameFieldName = "eventName"

  private val error: EventSubmissionError =
    UnexpectedEventSubmissionException("Forced exception", new Exception("Kaboom!"))
  private val returnedValueWithErrorInErrorChannel = EitherT.leftT[Future, Unit](error)
  private val returnedValueWithFailedFuture: EitherT[Future, EventSubmissionError, Unit] =
    EitherT.right(Future.failed(new Exception("Nobody expects the Spanish Inquisition!")))

  "submitEvent request" should {
    implicit val eventGen: Gen[IncomingEvent] = incomingEventGen
    implicit val getRoute: EventIngestorRoutes => Route = _.submitEvent
    implicit val path: EndpointPath = submitEventPath

    "return BadRequest in case of incorrect format of request body" in {
      testSubmitEventWithIncorrectFormatOfRequestBody()
    }

    "return BadRequest when request body has correct structure but a date has incorrect time zone" in {
      testSubmitEventWithIncorrectDateTimeZone[IncomingEvent]()
    }

    "return BadRequest when eventName is not set" in {
      testSubmitEventWithEmptyEventName[IncomingEvent]()
    }

    "return Unauthorized in case of lack of auth header" in {
      testSubmitEventWithoutAuthHeader[IncomingEvent]()
    }

    "return Unauthorized in case of InactiveAuthTokenError" in {
      testSubmitEventWithFailedAuthorization[IncomingEvent](
        InactiveAuthTokenError,
        SampleObjectFactory.inactiveAuthTokenErrorResponse)
    }

    "return Unauthorized in case of InvalidAuthTokenError" in {
      testSubmitEventWithFailedAuthorization[IncomingEvent](
        InvalidAuthTokenError("Kaboom!"),
        SampleObjectFactory.invalidAuthTokenErrorResponse)
    }

    "return Forbidden in case of MissingPermissionsError" in {
      testSubmitEventWithFailedAuthorization[IncomingEvent](
        MissingPermissionsError("Foo message"),
        SampleObjectFactory.missingPermissionsErrorResponse,
        StatusCodes.Forbidden)
    }

    "return error in case of failed call to bounded context" in {
      submitUserEventWithInternalError(returnedValueWithErrorInErrorChannel)
    }

    "return error in case of call to bounded context with unexpected failure" in {
      submitUserEventWithInternalError(returnedValueWithFailedFuture)
    }

    "return OK in case of succeeded call to bounded context" in {
      withRoutesMocked { (routes, eventIngestorBoundedContext) =>
        forAll(incomingEventGen) { event =>
          (eventIngestorBoundedContext
            .submitEvent(_: IncomingEvent, _: StellaAuthContext)(_: ExecutionContext))
            .expects(event, testAuthContext, *)
            .returning(EitherT.rightT(()))
          val underTest = Route.seal(routes.submitEvent)

          Post(submitEventPath.value, event) ~> authHeader ~> underTest ~> check {
            status shouldBe StatusCodes.OK
            response.entity.contentType shouldBe ContentTypes.NoContentType
          }
        }
      }
    }
  }

  "submitEventAsSuperAdmin request" should {
    implicit val eventGen: Gen[IncomingAdminEvent] = incomingAdminEventGen
    implicit val getRoute: EventIngestorRoutes => Route = _.submitEventAsSuperAdmin
    implicit val path: EndpointPath = submitEventAsSuperAdminPath

    "return BadRequest in case of incorrect format of request body" in {
      testSubmitEventWithIncorrectFormatOfRequestBody()
    }

    "return BadRequest when request body has correct structure but a date has incorrect time zone" in {
      testSubmitEventWithIncorrectDateTimeZone[IncomingAdminEvent]()
    }

    "return BadRequest when eventName is not set" in {
      testSubmitEventWithEmptyEventName[IncomingAdminEvent]()
    }

    "return Unauthorized in case of lack of auth header" in {
      testSubmitEventWithoutAuthHeader[IncomingAdminEvent]()
    }

    "return Unauthorized in case of InactiveAuthTokenError" in {
      testSubmitEventWithFailedAuthorization[IncomingAdminEvent](
        InactiveAuthTokenError,
        SampleObjectFactory.inactiveAuthTokenErrorResponse)
    }

    "return Unauthorized in case of InvalidAuthTokenError" in {
      testSubmitEventWithFailedAuthorization[IncomingAdminEvent](
        InvalidAuthTokenError("Kaboom!"),
        SampleObjectFactory.invalidAuthTokenErrorResponse)
    }

    "return Forbidden in case of MissingPermissionsError" in {
      testSubmitEventWithFailedAuthorization[IncomingAdminEvent](
        MissingPermissionsError("Foo message"),
        SampleObjectFactory.missingPermissionsErrorResponse,
        StatusCodes.Forbidden)
    }

    "return error in case of failed call to bounded context" in {
      testSubmitEventAsSuperAdminOrAdminWithInternalError(returnedValueWithErrorInErrorChannel)
    }

    "return error in case of call to bounded context with unexpected failure" in {
      testSubmitEventAsSuperAdminOrAdminWithInternalError(returnedValueWithFailedFuture)
    }

    "return OK in case of succeeded call to bounded context" in {
      successfullySubmitEventAsSuperAdminOrAdmin()
    }

    "return OK even in case the token doesn't include onBehalfOfProjectId value in its projects" in {
      val clientAssignedProjects = testAuthContext.additionalProjectIds + testAuthContext.primaryProjectId
      withRoutesMocked { (routes, eventIngestorBoundedContext) =>
        forAll(incomingAdminEventGen.suchThat(e =>
          // generate events that include onBehalfOfProjectId but that value is not included in the auth context
          e.onBehalfOfProjectId.isDefined && !clientAssignedProjects.contains(e.onBehalfOfProjectId.value))) { event =>
          (eventIngestorBoundedContext
            .submitEventAsAdmin(_: IncomingAdminEvent, _: StellaAuthContext)(_: ExecutionContext))
            .expects(event, testAuthContext, *)
            .returning(EitherT.rightT(()))
          val underTest = Route.seal(routes.submitEventAsSuperAdmin)

          Post(submitEventAsSuperAdminPath.value, event) ~> authHeader ~> underTest ~> check {
            status shouldBe StatusCodes.OK
            response.entity.contentType shouldBe ContentTypes.NoContentType
          }

        }
      }
    }
  }

  "submitEventAsAdmin request" should {
    implicit val eventGen: Gen[IncomingAdminEvent] = incomingAdminEventGen.map(e =>
      e.copy(onBehalfOfProjectId = e.onBehalfOfProjectId.map(_ => testAuthContext.primaryProjectId)))
    implicit val getRoute: EventIngestorRoutes => Route = _.submitEventAsAdmin
    implicit val path: EndpointPath = submitEventAsAdminPath

    "return BadRequest in case of incorrect format of request body" in {
      testSubmitEventWithIncorrectFormatOfRequestBody()
    }

    "return BadRequest when request body has correct structure but a date has incorrect time zone" in {
      testSubmitEventWithIncorrectDateTimeZone[IncomingAdminEvent]()
    }

    "return BadRequest when eventName is not set" in {
      testSubmitEventWithEmptyEventName[IncomingAdminEvent]()
    }

    "return Unauthorized in case of lack of auth header" in {
      testSubmitEventWithoutAuthHeader[IncomingAdminEvent]()
    }

    "return Unauthorized in case of InactiveAuthTokenError" in {
      testSubmitEventWithFailedAuthorization[IncomingAdminEvent](
        InactiveAuthTokenError,
        SampleObjectFactory.inactiveAuthTokenErrorResponse)
    }

    "return Unauthorized in case of InvalidAuthTokenError" in {
      testSubmitEventWithFailedAuthorization[IncomingAdminEvent](
        InvalidAuthTokenError("Kaboom!"),
        SampleObjectFactory.invalidAuthTokenErrorResponse)
    }

    "return Forbidden in case of MissingPermissionsError" in {
      testSubmitEventWithFailedAuthorization[IncomingAdminEvent](
        MissingPermissionsError("Foo message"),
        SampleObjectFactory.missingPermissionsErrorResponse,
        StatusCodes.Forbidden)
    }

    "return error in case of failed call to bounded context" in {
      testSubmitEventAsSuperAdminOrAdminWithInternalError(returnedValueWithErrorInErrorChannel)
    }

    "return error in case of call to bounded context with unexpected failure" in {
      testSubmitEventAsSuperAdminOrAdminWithInternalError(returnedValueWithFailedFuture)
    }

    "return OK in case of succeeded call to bounded context" in {
      successfullySubmitEventAsSuperAdminOrAdmin()
    }

    "return Forbidden in case the token doesn't include onBehalfOfProjectId value in its projects" in {
      val clientAssignedProjects = testAuthContext.additionalProjectIds + testAuthContext.primaryProjectId
      withRoutesMocked { (routes, eventIngestorBoundedContext) =>
        forAll(incomingAdminEventGen.suchThat(e =>
          // generate events that include onBehalfOfProjectId but that value is not included in the auth context
          e.onBehalfOfProjectId.isDefined && !clientAssignedProjects.contains(e.onBehalfOfProjectId.value))) { event =>
          (eventIngestorBoundedContext
            .submitEventAsAdmin(_: IncomingAdminEvent, _: StellaAuthContext)(_: ExecutionContext))
            .expects(*, *, *)
            .never()
          val underTest = Route.seal(routes.submitEventAsAdmin)

          Post(submitEventAsAdminPath.value, event) ~> authHeader ~> underTest ~> check {
            status shouldBe StatusCodes.Forbidden
            responseAs[Response[ErrorOutput]] shouldBe SampleObjectFactory.forbiddenErrorResponse
          }
        }
      }
    }
  }

  private def withRoutesMocked[T](body: (EventIngestorRoutes, EventIngestorBoundedContext) => T)(implicit
      auth: JwtAuthorization[StellaAuthContext] = acceptingJwtAuthorization): T = {
    val eventIngestorBoundedContext = mock[EventIngestorBoundedContext]
    val serverOptions = StellaAkkaHttpServerOptions.instance
    val serverInterpreter = AkkaHttpServerInterpreter(serverOptions)
    val openApiConfig = OpenApiConfig(serverUrl = "localhost:8080/ingestor")

    val routes = new EventIngestorRoutes(eventIngestorBoundedContext, serverInterpreter, openApiConfig)
    body(routes, eventIngestorBoundedContext)
  }

  private def testSubmitEventWithFailedAuthorization[EventType: ToEntityMarshaller](
      errorToBeForced: JwtAuthorizationError,
      expectedResponse: Response[ErrorOutput],
      expectedStatusCode: StatusCode = StatusCodes.Unauthorized)(implicit
      eventGen: Gen[EventType],
      getRoute: EventIngestorRoutes => Route,
      path: EndpointPath) = {
    implicit val auth: JwtAuthorization[StellaAuthContext] = new JwtAuthorization[StellaAuthContext] {
      override def verify(token: BearerToken, requiredPermissions: Seq[Permission])(implicit
          ec: ExecutionContext): EitherT[Future, JwtAuthorizationError, StellaAuthContext] =
        EitherT.leftT(errorToBeForced)
    }
    withRoutesMocked { (routes: EventIngestorRoutes, _) =>
      forAll(eventGen) { event =>
        val underTest = Route.seal(getRoute(routes))
        Post(path.value, event) ~> authHeader ~> underTest ~> check {
          status shouldBe expectedStatusCode
          responseAs[Response[ErrorOutput]] shouldBe expectedResponse
        }
      }
    }
  }

  private def expectErrorMessageResponseWithPrefix(errorCode: PresentationErrorCode, errorMessagePrefix: String) = {
    val res = responseAs[Response[ErrorOutput]]
    res.status shouldBe Response.errorStatus
    res.details.errorCodes shouldBe NonEmptyList.one(errorCode)
    res.details.errorMessage.value should startWith(errorMessagePrefix)
  }

  private def expectOutputWithErrorMessageResponse(errorCode: PresentationErrorCode, errorMessage: String) =
    responseAs[Response[ErrorOutput]] shouldBe Response.asFailure(ErrorOutput.one(errorCode, errorMessage))

  private def submitUserEventWithInternalError(returnedValue: EitherT[Future, EventSubmissionError, Unit]) =
    withRoutesMocked { (routes, eventIngestorBoundedContext) =>
      forAll(incomingEventGen) { event =>
        (eventIngestorBoundedContext
          .submitEvent(_: IncomingEvent, _: StellaAuthContext)(_: ExecutionContext))
          .expects(event, testAuthContext, *)
          .returning(returnedValue)
        val underTest = Route.seal(routes.submitEvent)

        Post(submitEventPath.value, event) ~> authHeader ~> underTest ~> check {
          status shouldBe StatusCodes.InternalServerError
          responseAs[Response[ErrorOutput]] shouldBe SampleObjectFactory.internalErrorResponse
        }
      }
    }

  private def testSubmitEventAsSuperAdminOrAdminWithInternalError(
      returnedValue: EitherT[Future, EventSubmissionError, Unit])(implicit
      eventGen: Gen[IncomingAdminEvent],
      getRoute: EventIngestorRoutes => Route,
      path: EndpointPath) =
    withRoutesMocked { (routes, eventIngestorBoundedContext) =>
      forAll(eventGen) { event =>
        (eventIngestorBoundedContext
          .submitEventAsAdmin(_: IncomingAdminEvent, _: StellaAuthContext)(_: ExecutionContext))
          .expects(event, testAuthContext, *)
          .returning(returnedValue)
        val underTest = Route.seal(getRoute(routes))

        Post(path.value, event) ~> authHeader ~> underTest ~> check {
          status shouldBe StatusCodes.InternalServerError
          responseAs[Response[ErrorOutput]] shouldBe SampleObjectFactory.internalErrorResponse
        }
      }
    }

  private def successfullySubmitEventAsSuperAdminOrAdmin()(implicit
      eventGen: Gen[IncomingAdminEvent],
      getRoute: EventIngestorRoutes => Route,
      path: EndpointPath) =
    withRoutesMocked { (routes, eventIngestorBoundedContext) =>
      forAll(eventGen) { event =>
        (eventIngestorBoundedContext
          .submitEventAsAdmin(_: IncomingAdminEvent, _: StellaAuthContext)(_: ExecutionContext))
          .expects(event, testAuthContext, *)
          .returning(EitherT.rightT(()))
        val underTest = Route.seal(getRoute(routes))

        Post(path.value, event) ~> authHeader ~> underTest ~> check {
          status shouldBe StatusCodes.OK
          response.entity.contentType shouldBe ContentTypes.NoContentType
        }
      }
    }

  private def testSubmitEventWithoutAuthHeader[EventType <: BaseEvent: ToEntityMarshaller]()(implicit
      eventGen: Gen[EventType],
      getRoute: EventIngestorRoutes => Route,
      path: EndpointPath) =
    withRoutesMocked { (routes, _) =>
      forAll(eventGen) { event =>
        val underTest = Route.seal(getRoute(routes))
        Post(path.value, event) ~> underTest ~> check {
          status shouldBe StatusCodes.Unauthorized
          expectOutputWithErrorMessageResponse(
            PresentationErrorCode.Unauthorized,
            "Invalid value for: header Authorization (missing)")
        }
      }
    }

  private def testSubmitEventWithIncorrectFormatOfRequestBody()(implicit
      getRoute: EventIngestorRoutes => Route,
      path: EndpointPath) =
    withRoutesMocked { (routes, _) =>
      val unexpectedEntity = "not an event"
      val underTest = Route.seal(getRoute(routes))
      Post(path.value, unexpectedEntity) ~> authHeader ~> underTest ~> check {
        status shouldBe StatusCodes.BadRequest
        expectErrorMessageResponseWithPrefix(PresentationErrorCode.BadRequest, "Invalid value for: body ")
      }
    }

  private def testSubmitEventWithIncorrectDateTimeZone[EventType <: BaseEvent: RootJsonFormat]()(implicit
      eventGen: Gen[EventType],
      getRoute: EventIngestorRoutes => Route,
      path: EndpointPath) = {
    val wrongValue = OffsetDateTime.now(ZoneOffset.ofHours(1)).toString
    testSubmitEventWithWrongJson(
      json => json.copy(fields = json.fields.updated(messageOriginDateUTCFieldName, JsString(wrongValue))),
      s"Invalid value for: body (requirement failed: $messageOriginDateUTCFieldName `$wrongValue` should have zone offset UTC)")
  }

  private def testSubmitEventWithEmptyEventName[EventType <: BaseEvent: RootJsonFormat]()(implicit
      eventGen: Gen[EventType],
      getRoute: EventIngestorRoutes => Route,
      path: EndpointPath) =
    testSubmitEventWithWrongJson(
      json => json.copy(fields = json.fields.removed(eventNameFieldName)),
      errorMessage =
        s"Invalid value for: body (Object is missing required member '$eventNameFieldName' at '$eventNameFieldName')")

  private def testSubmitEventWithWrongJson[EventType <: BaseEvent: RootJsonFormat](
      modifyJson: JsObject => JsObject,
      errorMessage: String)(implicit
      eventGen: Gen[EventType],
      getRoute: EventIngestorRoutes => Route,
      path: EndpointPath) =
    withRoutesMocked { (routes, _) =>
      val event = eventGen.sample.value
      val json = implicitly[RootJsonFormat[EventType]].write(event).asJsObject
      val unexpectedJson = modifyJson(json)
      val underTest = Route.seal(getRoute(routes))
      Post(path.value, unexpectedJson) ~> authHeader ~> underTest ~> check {
        status shouldBe StatusCodes.BadRequest
        expectOutputWithErrorMessageResponse(PresentationErrorCode.BadRequest, errorMessage)
      }
    }
}

object EventIngestorRoutesSpec {

  final case class EndpointPath(value: String)

  private val authHeader = Authorization(OAuth2BearerToken("token"))

  private val testAuthContext = StellaAuthContext(
    permissions = FullyPermissivePermissions,
    userId = UUID.randomUUID(),
    primaryProjectId = UUID.randomUUID(),
    additionalProjectIds = Set(UUID.randomUUID(), UUID.randomUUID()))

  private val acceptingJwtAuthorization = new JwtAuthorization[StellaAuthContext] {
    override def verify(token: BearerToken, requiredPermissions: Seq[Permission])(implicit
        ec: ExecutionContext): EitherT[Future, JwtAuthorizationError, StellaAuthContext] =
      EitherT.rightT(testAuthContext)
  }
}
