package stella.rules.routes.event

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.libs.json.JsObject
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.models.Ids.ProjectId

import stella.rules.gen.Generators._
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.event.FieldValueType
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.UpdateEventConfigurationRequest
import stella.rules.routes.ResponseFormats._
import stella.rules.routes.ResponseFormats.errorOutputFormats._
import stella.rules.routes.RoutesWithMockedBoundedContextSpecBase
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants.maxEventConfigNameLength
import stella.rules.routes.TestConstants.maxEventFieldNameLength
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationIsActive
import stella.rules.services.RuleConfiguratorBoundedContext._

trait EventConfigurationRoutesWithMockedBoundedContextSpecBase extends RoutesWithMockedBoundedContextSpecBase {

  protected val allowedProjectIdGen: Gen[ProjectId]
  protected val primaryProjectId: ProjectId = SampleObjectFactory.primaryProjectId
  protected val eventId: EventConfigurationEventId = EventConfigurationEventId.random()

  private val primaryProjectEventEndpointPath = testEventEndpointPath(primaryProjectId, eventId)
  private val unexpectedRuleConfiguratorError = UnexpectedRuleConfiguratorError("Test error", new Exception("Kaboom!"))
  private val eventConfigNotFoundError = EventConfigurationNotFoundError(eventId, ProjectId.random())
  private val eventConfigIsActiveError = EventConfigurationIsActiveError(eventId, ProjectId.random())

  protected def checkWritePermissionIsExpected(): Unit
  protected def checkReadPermissionIsExpected(): Unit
  protected def testEventsEndpointPath(projectId: ProjectId): String
  protected def testEventsEndpointPathWithIncludeInactiveParam(projectId: ProjectId, includeInactive: Boolean): String
  protected def testEventEndpointPath(projectId: ProjectId, eventId: EventConfigurationEventId): String

  "get event configurations" should {
    "return a collection of event configurations" in {
      forAll(eventConfigListGen, Arbitrary.arbBool.arbitrary, allowedProjectIdGen) {
        (eventConfigCollection, includeInactive, projectId) =>
          checkReadPermissionIsExpected()
          // GIVEN: bounded context which always returns a list of event configurations
          (boundedContext
            .getEventConfigurations(_: Boolean, _: ProjectId)(_: ExecutionContext))
            .expects(includeInactive, projectId, *)
            .returning(Future.successful(eventConfigCollection))
            .once()
          val request = FakeRequest(
            GET,
            testEventsEndpointPathWithIncludeInactiveParam(projectId, includeInactive),
            headersWithFakeJwt,
            AnyContentAsEmpty)

          // WHEN: we fetch configurations
          val res = route(app, request).value

          // THEN: the request succeeded and the proper collection is returned
          val expectedRes = Response.asSuccess(eventConfigCollection)
          status(res) mustBe OK
          contentType(res) mustBe Some(MimeTypes.JSON)
          contentAs[Response[Seq[EventConfiguration]]](res) mustBe expectedRes
      }
    }
  }

  "create event configuration" should {
    "return BadRequest on unknown field value type" in {
      val jsonWithWrongField =
        eventConfigJsonWithAdditionalFields(
          createEventConfigurationRequestJson,
          "additional-field-name" -> "wrong-type")
      val expectedErrorMessage =
        s"Invalid value for: body (wrong-type should be one of ${FieldValueType.values.mkString(", ")} at 'fields.valueType')"
      testCreateConfigWithBadRequest(jsonWithWrongField, expectedErrorMessage)
    }

    "return BadRequest on repeated field name" in {
      val fieldName = "foo_field_name"
      val eventJsonWithRepeatedFieldName =
        eventConfigJsonWithAdditionalFields(
          createEventConfigurationRequestJson,
          fieldName -> FieldValueType.Boolean.entryName,
          fieldName -> FieldValueType.String.entryName)
      val expectedErrorMessage =
        "Invalid value for: body (requirement failed: Event configuration can't contain multiple fields with the same name)"
      testCreateConfigWithBadRequest(eventJsonWithRepeatedFieldName, expectedErrorMessage)
    }

    "return BadRequest on empty or blank event configuration name" in {
      forAll(emptyOrBlankStringGen) { wrongValue =>
        testCreateConfigWithWrongEventConfigName(wrongValue)
      }
    }

    "return BadRequest on too long event configuration name" in {
      testCreateConfigWithWrongEventConfigName(dummyNonBlankString(maxEventConfigNameLength + 1))
    }

    "return BadRequest on event configuration name with wrong character" in {
      testCreateConfigWithWrongEventConfigName(wrongName = "name-with-$")
    }

    "return BadRequest on field name not matching expected pattern" in {
      forAll(eventFieldNameNotMatchingPatternGen) { wrongFieldName =>
        testCreateConfigWithWrongFieldName(wrongFieldName)
      }
    }

    "return BadRequest on too long event field name" in {
      testCreateConfigWithWrongFieldName(wrongFieldName = dummyNonBlankString(maxEventFieldNameLength + 1))
    }

    "return a created event configuration" in {
      forAll(eventConfigGen, allowedProjectIdGen) { (eventConfig, projectId) =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns an event configuration
        (boundedContext
          .createEventConfiguration(_: CreateEventConfigurationRequest, _: ProjectId)(_: ExecutionContext))
          .expects(createEventConfigurationRequest, projectId, *)
          .returning(
            EitherT[Future, CreateEventConfigurationError, EventConfiguration](Future.successful(Right(eventConfig))))
          .once()
        val request =
          FakeRequest(
            POST,
            testEventsEndpointPath(projectId),
            headersWithFakeJwt,
            AnyContentAsJson(createEventConfigurationRequestJson))

        sendAndExpectEventConfiguration(eventConfig, request, expectedStatusCode = CREATED)
      }
    }
  }

  "get single event configuration" should {
    "return an event configuration" in {
      forAll(eventConfigGen, allowedProjectIdGen) { (eventConfig, projectId) =>
        checkReadPermissionIsExpected()
        // GIVEN: bounded context which always returns an event configuration
        (boundedContext
          .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(
            EitherT[Future, GetEventConfigurationError, EventConfiguration](Future.successful(Right(eventConfig))))
          .once()
        val request = FakeRequest(GET, testEventEndpointPath(projectId, eventId), headersWithFakeJwt, AnyContentAsEmpty)

        sendAndExpectEventConfiguration(eventConfig, request)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkReadPermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
        .expects(eventId, primaryProjectId, *)
        .returning(EitherT[Future, GetEventConfigurationError, EventConfiguration](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request = FakeRequest(GET, primaryProjectEventEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectInternalError(request)
    }

    "return NotFound when event configuration could not be found" in {
      checkReadPermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .getEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
        .expects(eventId, primaryProjectId, *)
        .returning(EitherT[Future, GetEventConfigurationError, EventConfiguration](
          Future.successful(Left(eventConfigNotFoundError))))
        .once()
      val request =
        FakeRequest(GET, primaryProjectEventEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectEventConfigNotFound(request)
    }
  }

  "update event configuration" should {
    "return an updated event configuration" in {
      forAll(eventConfigGen, allowedProjectIdGen) { (eventConfig, projectId) =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns an event configuration
        (boundedContext
          .updateEventConfiguration(_: EventConfigurationEventId, _: UpdateEventConfigurationRequest, _: ProjectId)(
            _: ExecutionContext))
          .expects(eventId, activateEventConfigurationRequest, projectId, *)
          .returning(
            EitherT[Future, UpdateEventConfigurationError, EventConfiguration](Future.successful(Right(eventConfig))))
          .once()
        val request = FakeRequest(
          PATCH,
          testEventEndpointPath(projectId, eventId),
          headersWithFakeJwt,
          AnyContentAsJson(activateEventConfigurationRequestJson))

        sendAndExpectEventConfiguration(eventConfig, request)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .updateEventConfiguration(_: EventConfigurationEventId, _: UpdateEventConfigurationRequest, _: ProjectId)(
          _: ExecutionContext))
        .expects(eventId, activateEventConfigurationRequest, primaryProjectId, *)
        .returning(EitherT[Future, UpdateEventConfigurationError, EventConfiguration](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request =
        FakeRequest(
          PATCH,
          primaryProjectEventEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(activateEventConfigurationRequestJson))

      sendAndExpectInternalError(request)
    }

    "return NotFound when event configuration could not be found" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .updateEventConfiguration(_: EventConfigurationEventId, _: UpdateEventConfigurationRequest, _: ProjectId)(
          _: ExecutionContext))
        .expects(eventId, activateEventConfigurationRequest, primaryProjectId, *)
        .returning(EitherT[Future, UpdateEventConfigurationError, EventConfiguration](
          Future.successful(Left(eventConfigNotFoundError))))
        .once()
      val request =
        FakeRequest(
          PATCH,
          primaryProjectEventEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(
            UpdateEventConfigurationRequest.updateEventConfigurationRequestPlayFormat.writes(
              activateEventConfigurationRequest)))

      sendAndExpectEventConfigNotFound(request)
    }

    "return BadRequest when update request doesn't contain fields to change" in {
      val expectedErrorMessage = "Invalid value for: body (requirement failed: No data to update specified)"
      val request =
        FakeRequest(PATCH, primaryProjectEventEndpointPath, headersWithFakeJwt, AnyContentAsJson(JsObject.empty))
      checkWritePermissionIsExpected()
      val res = route(app, request).value

      status(res) mustBe BAD_REQUEST
      contentType(res) mustBe Some(MimeTypes.JSON)
      contentAs[Response[ErrorOutput]](res) mustBe errorOutputResponse(
        PresentationErrorCode.BadRequest,
        expectedErrorMessage)
    }
  }

  "delete event configuration" should {
    "return only status code" in {
      forAll(allowedProjectIdGen) { projectId =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns Unit
        (boundedContext
          .deleteEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
          .expects(eventId, projectId, *)
          .returning(EitherT[Future, DeleteEventConfigurationError, Unit](Future.successful(Right(()))))
          .once()
        val request =
          FakeRequest(DELETE, testEventEndpointPath(projectId, eventId), headersWithFakeJwt, AnyContentAsEmpty)

        // WHEN: we send a request
        val res = route(app, request).value

        // THEN: the request returns NO_CONTENT and there's really no content
        status(res) mustBe NO_CONTENT
        contentType(res) mustBe None
      }
    }

    "return InternalServerError on unexpected error" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .deleteEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
        .expects(eventId, primaryProjectId, *)
        .returning(EitherT[Future, DeleteEventConfigurationError, Unit](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request = FakeRequest(DELETE, primaryProjectEventEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectInternalError(request)
    }

    "return NotFound when event configuration could not be found" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .deleteEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
        .expects(eventId, primaryProjectId, *)
        .returning(
          EitherT[Future, DeleteEventConfigurationError, Unit](Future.successful(Left(eventConfigNotFoundError))))
        .once()
      val request = FakeRequest(DELETE, primaryProjectEventEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectEventConfigNotFound(request)
    }

    "return Conflict when event configuration is active" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .deleteEventConfiguration(_: EventConfigurationEventId, _: ProjectId)(_: ExecutionContext))
        .expects(eventId, primaryProjectId, *)
        .returning(
          EitherT[Future, DeleteEventConfigurationError, Unit](Future.successful(Left(eventConfigIsActiveError))))
        .once()
      val request = FakeRequest(DELETE, primaryProjectEventEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectEventConfigIsActiveError(request)
    }
  }

  private def testCreateConfigWithWrongEventConfigName(wrongName: String) = {
    val jsonWithWrongConfigName = eventConfigJsonWithChangedName(createEventConfigurationRequestJson, wrongName)
    val expectedErrorMessage = "Invalid value for: body (requirement failed: Event configuration name must have " +
      s"length 1–50 and contain only a-z0-9.- characters, but it was $wrongName)"
    testCreateConfigWithBadRequest(jsonWithWrongConfigName, expectedErrorMessage)
  }

  private def testCreateConfigWithWrongFieldName(wrongFieldName: String) = {
    val jsonWithWrongFieldName =
      eventConfigJsonWithAdditionalFields(
        createEventConfigurationRequestJson,
        wrongFieldName -> FieldValueType.String.entryName)
    val expectedErrorMessage =
      wrongEventFieldNameErrorMessage("Event field name", wrongFieldName)
    testCreateConfigWithBadRequest(jsonWithWrongFieldName, expectedErrorMessage)
  }

  private def testCreateConfigWithBadRequest(wrongJson: JsObject, expectedErrorMessage: String) = {
    checkWritePermissionIsExpected()
    val request =
      FakeRequest(POST, testEventsEndpointPath(primaryProjectId), headersWithFakeJwt, AnyContentAsJson(wrongJson))
    val res = route(app, request).value

    status(res) mustBe BAD_REQUEST
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe errorOutputResponse(
      PresentationErrorCode.BadRequest,
      expectedErrorMessage)
  }

  private def sendAndExpectEventConfiguration[T: Writeable](
      eventConfig: EventConfiguration,
      request: FakeRequest[T],
      expectedStatusCode: Int = OK) = {
    // WHEN: we send a request
    val res = route(app, request).value

    // THEN: the request succeeded and the proper config is returned
    val expectedRes = Response.asSuccess(eventConfig)
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[EventConfiguration]](res) mustBe expectedRes
  }

  private def sendAndExpectEventConfigIsActiveError[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, CONFLICT, EventConfigurationIsActive)
}
