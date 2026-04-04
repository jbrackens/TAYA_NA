package stella.wallet.routes.currency

import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.wallet.routes.RoutesWithInvalidJwtSpecBase
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.routes.TestConstants.Endpoint._

class CurrencyRoutesWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  "getCurrencies" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, getCurrenciesEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, getCurrenciesEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getCurrency" should {
    val path = getCurrencyEndpointPath(testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, path, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getCurrenciesAsAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, getCurrenciesAsAdminEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, getCurrenciesAsAdminEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getCurrencyAsAdmin" should {
    val path = getCurrencyAsAdminEndpointPath(testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request =
        FakeRequest(GET, path, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getCurrenciesAsSuperAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, getCurrenciesAsSuperAdminEndpointPath())
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, getCurrenciesAsSuperAdminEndpointPath(), headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getCurrencyAsSuperAdmin" should {
    val path = getCurrencyAsSuperAdminEndpointPath(testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request =
        FakeRequest(GET, path, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "createCurrencyAsAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(POST, createCurrencyAsAdminEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        POST,
        createCurrencyAsAdminEndpointPath,
        headersWithInvalidJwt,
        AnyContentAsJson(createCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "createCurrencyAsSuperAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(POST, createCurrencyAsSuperAdminEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        POST,
        createCurrencyAsSuperAdminEndpointPath,
        headersWithInvalidJwt,
        AnyContentAsJson(createCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "updateCurrencyAsAdmin" should {
    val path = updateCurrencyAsAdminEndpointPath(testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(PATCH, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        PATCH,
        path,
        headersWithInvalidJwt,
        AnyContentAsJson(updateCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "updateCurrencyAsSuperAdmin" should {
    val path = updateCurrencyAsSuperAdminEndpointPath(testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(PATCH, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        PATCH,
        path,
        headersWithInvalidJwt,
        AnyContentAsJson(updateCurrencyWithAssociatedProjectsRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "deleteCurrencyFromProjectAsAdmin" should {
    val path = deleteCurrencyFromProjectAsAdminEndpointPath(testProjectId, testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(DELETE, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(DELETE, path, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }
}
