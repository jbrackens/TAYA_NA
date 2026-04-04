package stella.usercontext.routes

import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.usercontext.routes.SampleObjectFactory._

class UserContextRoutesWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  "putUserContextAsAdmin" should {
    "return Unauthorized when JWT was not specified" in {
      testRequestWithoutAuthTokenForHttpRequestTypeAndPath(PUT, userContextAsAdminPath)
    }

    "return Unauthorized when invalid JWT was specified" in {
      val request = FakeRequest(PUT, userContextAsAdminPath, headersWithInvalidJwt, AnyContentAsJson(testJsonObject))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "modifyUserContextAsAdmin" should {
    "return Unauthorized when JWT was not specified" in {
      testRequestWithoutAuthTokenForHttpRequestTypeAndPath(PATCH, userContextAsAdminPath)
    }

    "return Unauthorized when invalid JWT was specified" in {
      val request = FakeRequest(PATCH, userContextAsAdminPath, headersWithInvalidJwt, AnyContentAsJson(testJsonObject))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getUserContextAsAdmin" should {
    "return Unauthorized when JWT was not specified" in {
      testRequestWithoutAuthTokenForHttpRequestTypeAndPath(GET, userContextAsAdminPath)
    }

    "return Unauthorized when invalid JWT was specified" in {
      val request = FakeRequest(GET, userContextAsAdminPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "deleteUserContextAsAdmin" should {
    "return Unauthorized when JWT was not specified" in {
      testRequestWithoutAuthTokenForHttpRequestTypeAndPath(DELETE, userContextAsAdminPath)
    }

    "return Unauthorized when invalid JWT was specified" in {
      val request = FakeRequest(DELETE, userContextAsAdminPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "putUserContext" should {
    "return Unauthorized when JWT was not specified" in {
      testRequestWithoutAuthTokenForHttpRequestTypeAndPath(PUT, userContextPath)
    }

    "return Unauthorized when invalid JWT was specified" in {
      val request = FakeRequest(PUT, userContextPath, headersWithInvalidJwt, AnyContentAsJson(testJsonObject))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "modifyUserContext" should {
    "return Unauthorized when JWT was not specified" in {
      testRequestWithoutAuthTokenForHttpRequestTypeAndPath(PATCH, userContextPath)
    }

    "return Unauthorized when invalid JWT was specified" in {
      val request = FakeRequest(PATCH, userContextPath, headersWithInvalidJwt, AnyContentAsJson(testJsonObject))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getUserContext" should {
    "return Unauthorized when JWT was not specified" in {
      testRequestWithoutAuthTokenForHttpRequestTypeAndPath(GET, userContextPath)
    }

    "return Unauthorized when invalid JWT was specified" in {
      val request = FakeRequest(GET, userContextPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "deleteUserContext" should {
    "return Unauthorized when JWT was not specified" in {
      testRequestWithoutAuthTokenForHttpRequestTypeAndPath(DELETE, userContextPath)
    }

    "return Unauthorized when invalid JWT was specified" in {
      val request = FakeRequest(DELETE, userContextPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  private def testRequestWithoutAuthTokenForHttpRequestTypeAndPath(method: String, path: String) = {
    val request = FakeRequest(method, path)
    testRequestWithoutAuthToken(request)
  }
}
