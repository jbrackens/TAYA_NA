package stella.usercontext.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import io.circe.Json
import org.scalacheck.Gen
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.models.Ids.ProjectId

import stella.usercontext.gen.Generators._
import stella.usercontext.models.Ids.UserContextKey
import stella.usercontext.routes.ResponseFormats._
import stella.usercontext.routes.ResponseFormats.errorOutputFormats._
import stella.usercontext.routes.SampleObjectFactory._
import stella.usercontext.services.UserContextBoundedContext.Errors._
import stella.usercontext.services.UserContextBoundedContext.UserContextPermissions

class UserContextRoutesWithMockedBoundedContextSpec extends RoutesWithMockedBoundedContextSpecBase {
  private val lackOfJsonBodyErrorMessage = "Invalid value for: body (Unexpected end-of-input at input index 0 " +
    "(line 1, position 1), expected JSON Value:\n\n^\n)"

  "putUserContextAsAdmin" should {
    "return BadRequest when user data JSON is not specified" in {
      val request = FakeRequest(PUT, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsEmpty)
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      testRequestWithBadRequestResponse(request, lackOfJsonBodyErrorMessage)
    }

    "return BadRequest when user data is not JSON object" in {
      forAll(Gen.oneOf(jsNullGen, jsBooleanGen, jsNumberGen, jsStringGen, jsArrayGen)) { json =>
        val request = FakeRequest(PUT, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsJson(json))
        val expectedErrorMessage = s"Invalid value for: body ($json is not JSON object)"
        checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
        testRequestWithBadRequestResponse(request, expectedErrorMessage)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      (boundedContext
        .putUserContext(_: UserContextKey, _: Json)(_: ExecutionContext))
        .expects(testUserContextKey, testCirceJson, *)
        .returning(EitherT[Future, PutUserContextError, Unit](Future.failed(new Exception("Kaboom!"))))
      val request = FakeRequest(PUT, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsJson(testJsonObject))
      testRequestWithInternalServerErrorResponse(request)
    }

    "return Forbidden when the requested project in not in the admin's token" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      (boundedContext.putUserContext(_: UserContextKey, _: Json)(_: ExecutionContext)).expects(*, *, *).never()
      val userContextAsAdminPath = getUserContextAsAdminPath(ProjectId.random(), testUserId)
      val request = FakeRequest(PUT, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsJson(testJsonObject))
      testRequestWithForbiddenErrorResponse(request)
    }

    "succeed in case of success in bounded context" in {
      forAll(jsonObjectGen) { json =>
        checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
        (boundedContext
          .putUserContext(_: UserContextKey, _: Json)(_: ExecutionContext))
          .expects(testUserContextKey, toCirceJson(json), *)
          .returning(EitherT[Future, PutUserContextError, Unit](Future.successful(Right(()))))
        val request = FakeRequest(PUT, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsJson(json))
        testRequestWithStatusAndEmptyResponse(request, OK)
      }
    }
  }

  "modifyUserContextAsAdmin" should {
    "return BadRequest when user data JSON is not specified" in {
      val request = FakeRequest(PATCH, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsEmpty)
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      testRequestWithBadRequestResponse(request, lackOfJsonBodyErrorMessage)
    }

    "return BadRequest when user data is not JSON object" in {
      forAll(Gen.oneOf(jsNullGen, jsBooleanGen, jsNumberGen, jsStringGen, jsArrayGen)) { json =>
        val request = FakeRequest(PATCH, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsJson(json))
        val expectedErrorMessage = s"Invalid value for: body ($json is not JSON object)"
        checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
        testRequestWithBadRequestResponse(request, expectedErrorMessage)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      (boundedContext
        .modifyUserContext(_: UserContextKey, _: Json)(_: ExecutionContext))
        .expects(testUserContextKey, testCirceJson, *)
        .returning(EitherT[Future, ModifyUserContextError, Unit](Future.failed(new Exception("Kaboom!"))))
      val request = FakeRequest(PATCH, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsJson(testJsonObject))
      testRequestWithInternalServerErrorResponse(request)
    }

    "return Forbidden when the requested project in not in the admin's token" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      (boundedContext.modifyUserContext(_: UserContextKey, _: Json)(_: ExecutionContext)).expects(*, *, *).never()
      val userContextAsAdminPath = getUserContextAsAdminPath(ProjectId.random(), testUserId)
      val request = FakeRequest(PATCH, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsJson(testJsonObject))
      testRequestWithForbiddenErrorResponse(request)
    }

    "succeed in case of success in bounded context" in {
      forAll(jsonObjectGen) { json =>
        checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
        (boundedContext
          .modifyUserContext(_: UserContextKey, _: Json)(_: ExecutionContext))
          .expects(testUserContextKey, toCirceJson(json), *)
          .returning(EitherT[Future, ModifyUserContextError, Unit](Future.successful(Right(()))))
        val request = FakeRequest(PATCH, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsJson(json))
        testRequestWithStatusAndEmptyResponse(request, OK)
      }
    }
  }

  "getUserContextAsAdmin" should {
    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminReadPermission)
      (boundedContext
        .getUserContext(_: UserContextKey)(_: ExecutionContext))
        .expects(testUserContextKey, *)
        .returning(EitherT[Future, GetUserContextError, Json](Future.failed(new Exception("Kaboom!"))))
      val request = FakeRequest(GET, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return Forbidden when the requested project in not in the admin's token" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminReadPermission)
      (boundedContext.getUserContext(_: UserContextKey)(_: ExecutionContext)).expects(*, *).never()
      val userContextAsAdminPath = getUserContextAsAdminPath(ProjectId.random(), testUserId)
      val request = FakeRequest(GET, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithForbiddenErrorResponse(request)
    }

    "properly return results" in {
      forAll(jsonObjectGen) { json =>
        checkExpectedPermission(UserContextPermissions.UserContextAdminReadPermission)
        val returnedJson = toCirceJson(json)
        (boundedContext
          .getUserContext(_: UserContextKey)(_: ExecutionContext))
          .expects(testUserContextKey, *)
          .returning(EitherT[Future, GetUserContextError, Json](Future.successful(Right(returnedJson))))
        val request = FakeRequest(GET, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsEmpty)
        val res = route(app, request).value
        withOkStatusAndJsonContentAs[Response[Json]](res) shouldBe Response.asSuccess(returnedJson)
      }
    }
  }

  "deleteUserContextAsAdmin" should {
    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      (boundedContext
        .deleteUserContext(_: UserContextKey)(_: ExecutionContext))
        .expects(testUserContextKey, *)
        .returning(EitherT[Future, DeleteUserContextError, Unit](Future.failed(new Exception("Kaboom!"))))
      val request = FakeRequest(DELETE, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "return Forbidden when the requested project in not in the admin's token" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      (boundedContext.deleteUserContext(_: UserContextKey)(_: ExecutionContext)).expects(*, *).never()
      val userContextAsAdminPath = getUserContextAsAdminPath(ProjectId.random(), testUserId)
      val request = FakeRequest(DELETE, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithForbiddenErrorResponse(request)
    }

    "succeed in case of success in bounded context" in {
      checkExpectedPermission(UserContextPermissions.UserContextAdminWritePermission)
      (boundedContext
        .deleteUserContext(_: UserContextKey)(_: ExecutionContext))
        .expects(testUserContextKey, *)
        .returning(EitherT[Future, DeleteUserContextError, Unit](Future.successful(Right(()))))
      val request = FakeRequest(DELETE, userContextAsAdminPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithStatusAndEmptyResponse(request, NO_CONTENT)
    }
  }

  "putUserContext" should {
    "return BadRequest when user data JSON is not specified" in {
      val request = FakeRequest(PUT, userContextPath, headersWithFakeJwt, AnyContentAsEmpty)
      checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
      testRequestWithBadRequestResponse(request, lackOfJsonBodyErrorMessage)
    }

    "return BadRequest when user data is not JSON object" in {
      forAll(Gen.oneOf(jsNullGen, jsBooleanGen, jsNumberGen, jsStringGen, jsArrayGen)) { json =>
        val request = FakeRequest(PUT, userContextPath, headersWithFakeJwt, AnyContentAsJson(json))
        val expectedErrorMessage = s"Invalid value for: body ($json is not JSON object)"
        checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
        testRequestWithBadRequestResponse(request, expectedErrorMessage)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
      (boundedContext
        .putUserContext(_: UserContextKey, _: Json)(_: ExecutionContext))
        .expects(testSenderUserContextKey, testCirceJson, *)
        .returning(EitherT[Future, PutUserContextError, Unit](Future.failed(new Exception("Kaboom!"))))
      val request = FakeRequest(PUT, userContextPath, headersWithFakeJwt, AnyContentAsJson(testJsonObject))
      testRequestWithInternalServerErrorResponse(request)
    }

    "succeed in case of success in bounded context" in {
      forAll(jsonObjectGen) { json =>
        checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
        (boundedContext
          .putUserContext(_: UserContextKey, _: Json)(_: ExecutionContext))
          .expects(testSenderUserContextKey, toCirceJson(json), *)
          .returning(EitherT[Future, PutUserContextError, Unit](Future.successful(Right(()))))
        val request = FakeRequest(PUT, userContextPath, headersWithFakeJwt, AnyContentAsJson(json))
        testRequestWithStatusAndEmptyResponse(request, OK)
      }
    }
  }

  "modifyUserContext" should {
    "return BadRequest when user data JSON is not specified" in {
      val request = FakeRequest(PATCH, userContextPath, headersWithFakeJwt, AnyContentAsEmpty)
      checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
      testRequestWithBadRequestResponse(request, lackOfJsonBodyErrorMessage)
    }

    "return BadRequest when user data is not JSON object" in {
      forAll(Gen.oneOf(jsNullGen, jsBooleanGen, jsNumberGen, jsStringGen, jsArrayGen)) { json =>
        val request = FakeRequest(PATCH, userContextPath, headersWithFakeJwt, AnyContentAsJson(json))
        val expectedErrorMessage = s"Invalid value for: body ($json is not JSON object)"
        checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
        testRequestWithBadRequestResponse(request, expectedErrorMessage)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
      (boundedContext
        .modifyUserContext(_: UserContextKey, _: Json)(_: ExecutionContext))
        .expects(testSenderUserContextKey, testCirceJson, *)
        .returning(EitherT[Future, ModifyUserContextError, Unit](Future.failed(new Exception("Kaboom!"))))
      val request = FakeRequest(PATCH, userContextPath, headersWithFakeJwt, AnyContentAsJson(testJsonObject))
      testRequestWithInternalServerErrorResponse(request)
    }

    "succeed in case of success in bounded context" in {
      forAll(jsonObjectGen) { json =>
        checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
        (boundedContext
          .modifyUserContext(_: UserContextKey, _: Json)(_: ExecutionContext))
          .expects(testSenderUserContextKey, toCirceJson(json), *)
          .returning(EitherT[Future, ModifyUserContextError, Unit](Future.successful(Right(()))))
        val request = FakeRequest(PATCH, userContextPath, headersWithFakeJwt, AnyContentAsJson(json))
        testRequestWithStatusAndEmptyResponse(request, OK)
      }
    }
  }

  "getUserContext" should {
    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(UserContextPermissions.UserContextReadPermission)
      (boundedContext
        .getUserContext(_: UserContextKey)(_: ExecutionContext))
        .expects(testSenderUserContextKey, *)
        .returning(EitherT[Future, GetUserContextError, Json](Future.failed(new Exception("Kaboom!"))))
      val request = FakeRequest(GET, userContextPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "properly return results" in {
      forAll(jsonObjectGen) { json =>
        checkExpectedPermission(UserContextPermissions.UserContextReadPermission)
        val returnedJson = toCirceJson(json)
        (boundedContext
          .getUserContext(_: UserContextKey)(_: ExecutionContext))
          .expects(testSenderUserContextKey, *)
          .returning(EitherT[Future, GetUserContextError, Json](Future.successful(Right(returnedJson))))
        val request = FakeRequest(GET, userContextPath, headersWithFakeJwt, AnyContentAsEmpty)
        val res = route(app, request).value
        withOkStatusAndJsonContentAs[Response[Json]](res) shouldBe Response.asSuccess(returnedJson)
      }
    }
  }

  "deleteUserContext" should {
    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
      (boundedContext
        .deleteUserContext(_: UserContextKey)(_: ExecutionContext))
        .expects(testSenderUserContextKey, *)
        .returning(EitherT[Future, DeleteUserContextError, Unit](Future.failed(new Exception("Kaboom!"))))
      val request = FakeRequest(DELETE, userContextPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithInternalServerErrorResponse(request)
    }

    "succeed in case of success in bounded context" in {
      checkExpectedPermission(UserContextPermissions.UserContextWritePermission)
      (boundedContext
        .deleteUserContext(_: UserContextKey)(_: ExecutionContext))
        .expects(testSenderUserContextKey, *)
        .returning(EitherT[Future, DeleteUserContextError, Unit](Future.successful(Right(()))))
      val request = FakeRequest(DELETE, userContextPath, headersWithFakeJwt, AnyContentAsEmpty)
      testRequestWithStatusAndEmptyResponse(request, NO_CONTENT)
    }
  }

  private def testRequestWithBadRequestResponse[T: Writeable](request: FakeRequest[T], expectedErrorMessage: String) =
    testRequestWithErrorResponse(request, Some(expectedErrorMessage), BAD_REQUEST, PresentationErrorCode.BadRequest)

  private def testRequestWithInternalServerErrorResponse[T: Writeable](request: FakeRequest[T]) =
    testRequestWithErrorResponse(request, None, INTERNAL_SERVER_ERROR, PresentationErrorCode.InternalError)

  private def testRequestWithForbiddenErrorResponse[T: Writeable](request: FakeRequest[T]) =
    testRequestWithErrorResponse(request, None, FORBIDDEN, PresentationErrorCode.Forbidden)

  private def testRequestWithErrorResponse[T: Writeable](
      request: FakeRequest[T],
      expectedErrorMessage: Option[String],
      statusCode: Int,
      presentationCode: PresentationErrorCode) = {
    val res = route(app, request).value
    status(res) mustBe statusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    val expectedResponse = expectedErrorMessage match {
      case Some(msg) => errorOutputResponse(presentationCode, msg)
      case None      => errorOutputResponse(presentationCode)
    }
    contentAs[Response[ErrorOutput]](res) mustBe expectedResponse
  }

  private def testRequestWithStatusAndEmptyResponse[T: Writeable](request: FakeRequest[T], statusCode: Int) = {
    val res = route(app, request).value
    status(res) shouldBe statusCode
    contentType(res) shouldBe None
  }
}
