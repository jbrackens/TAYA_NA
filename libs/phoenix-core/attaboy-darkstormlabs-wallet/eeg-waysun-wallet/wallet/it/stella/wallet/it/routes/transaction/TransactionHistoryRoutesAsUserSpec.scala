package stella.wallet.it.routes.transaction

import java.time.OffsetDateTime

import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.it.utils.TestAuthContext
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionType
import stella.wallet.routes.ResponseFormats._
import stella.wallet.routes.TestConstants.Endpoint.getTransactionHistoryEndpointPath
import stella.wallet.routes.error.AdditionalPresentationErrorCode

class TransactionHistoryRoutesAsUserSpec
    extends TransactionHistoryRoutesSpecBase(mainTestName = "getTransactionHistory") {

  override def fetchTransactions(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      transactionTypes: Set[TransactionType] = Set.empty,
      dateRangeStart: Option[OffsetDateTime] = None,
      dateRangeEnd: Option[OffsetDateTime] = None,
      sortFromNewestToOldest: Option[Boolean] = None): Seq[Transaction] = {
    val request = FakeRequest(
      GET,
      getTransactionHistoryEndpointPath(
        currencyId,
        transactionTypes,
        dateRangeStart,
        dateRangeEnd,
        sortFromNewestToOldest),
      headersWithJwt,
      AnyContentAsEmpty)
    sendRequestAndReturn[AnyContentAsEmpty.type, Seq[Transaction]](request, TestAuthContext(walletOwnerId, projectId))
  }

  override def fetchTransactionsWithNotFoundError(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId): Unit = {
    val request = FakeRequest(GET, getTransactionHistoryEndpointPath(currencyId), headersWithJwt, AnyContentAsEmpty)
    val _ = testFailedRequest(
      request = request,
      expectedStatusCode = NOT_FOUND,
      expectedErrorCode = AdditionalPresentationErrorCode.ProjectCurrencyNotFound,
      authContext = TestAuthContext(walletOwnerId, projectId))
  }
}
