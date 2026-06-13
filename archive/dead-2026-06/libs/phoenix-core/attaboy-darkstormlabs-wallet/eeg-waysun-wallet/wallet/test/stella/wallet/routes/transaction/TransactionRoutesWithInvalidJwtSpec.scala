package stella.wallet.routes.transaction

import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.wallet.routes.RoutesWithInvalidJwtSpecBase
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.routes.TestConstants.Endpoint._

class TransactionRoutesWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  "getTransactionHistory" should {
    val path = getTransactionHistoryEndpointPath(testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, path, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getTransactionHistoryAsAdmin" should {
    val path = getTransactionHistoryAsAdminEndpointPath(testUserId, testCurrencyId)

    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, path)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, path, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }
}
