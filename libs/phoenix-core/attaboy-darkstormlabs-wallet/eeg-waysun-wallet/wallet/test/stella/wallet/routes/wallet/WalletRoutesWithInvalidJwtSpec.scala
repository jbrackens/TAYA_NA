package stella.wallet.routes.wallet

import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.wallet.routes.RoutesWithInvalidJwtSpecBase
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.routes.TestConstants.Endpoint._

class WalletRoutesWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  "getBalances" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, getBalancesEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, getBalancesEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getBalance" should {
    val path = getBalanceEndpointPath(testCurrencyId)

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

  "getBalancesAsAdmin" should {
    val path = getBalancesAsAdminEndpointPath(testUserId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, path, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getBalanceAsAdmin" should {
    val path = getBalanceAsAdminEndpointPath(testUserId, testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, path, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "transferFundsAsAdmin" should {
    val path = transferFundsAsAdminEndpointPath(testProjectId, testUserId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(POST, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(POST, path, headersWithInvalidJwt, AnyContentAsJson(transferFundsRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }
}
