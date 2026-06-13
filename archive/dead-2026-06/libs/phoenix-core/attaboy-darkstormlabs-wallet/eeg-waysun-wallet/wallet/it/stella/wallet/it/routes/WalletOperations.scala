package stella.wallet.it.routes

import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.it.utils.TestAuthContext
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.wallet.FundsTransferType
import stella.wallet.models.wallet.PositiveBigDecimal
import stella.wallet.models.wallet.TransferFundsRequest
import stella.wallet.routes.TestConstants.Endpoint.transferFundsAsAdminEndpointPath

trait WalletOperations { self: RoutesSpecBase =>

  protected def topUpFunds(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      amount: PositiveBigDecimal): Unit =
    transferFunds(projectId, walletOwnerId, currencyId, amount, FundsTransferType.TopUpFunds)

  protected def withdrawFunds(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      amount: PositiveBigDecimal): Unit =
    transferFunds(projectId, walletOwnerId, currencyId, amount, FundsTransferType.WithdrawFunds)

  protected def transferFunds(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      amount: PositiveBigDecimal,
      transferType: FundsTransferType,
      externalTransactionId: String = "test-tx",
      title: String = "Test tx",
      requesterId: UserId = UserId.random()): Unit = {
    val authContext = TestAuthContext(requesterId, projectId)
    val transferFundsRequest = TransferFundsRequest(
      transferType = transferType,
      externalTransactionId = externalTransactionId,
      title = title,
      currencyId = currencyId,
      amount = amount)
    val transferFundsRequestJson =
      TransferFundsRequest.transferFundsRequestPlayFormat.writes(transferFundsRequest)
    val request =
      FakeRequest(
        POST,
        transferFundsAsAdminEndpointPath(projectId, walletOwnerId),
        headersWithJwt,
        AnyContentAsJson(transferFundsRequestJson))
    sendRequestWithEmptyResponse[AnyContentAsJson](request, authContext, OK)
    ()
  }
}
