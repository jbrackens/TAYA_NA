package phoenix.wallets.infrastructure.http

import scala.concurrent.ExecutionContext

import sttp.model.StatusCode

import phoenix.core.Clock
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.jwt.JwtAuthenticator
import phoenix.prediction.infrastructure.PredictionHistoryLookup
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.wallets.WalletProduct
import phoenix.wallets.WalletTransactionView
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.WalletsBoundedContextProtocol.WalletTransactionsQuery
import phoenix.wallets.infrastructure.http.WalletEndpoints.responsibilityCheckAcceptanceEndpoint
import phoenix.wallets.infrastructure.http.WalletEndpoints.walletBalanceEndpoint
import phoenix.wallets.infrastructure.http.WalletEndpoints.walletTransactionsEndpoint

final class WalletRoutes(
    wallets: WalletsBoundedContext,
    predictionHistoryLookup: PredictionHistoryLookup = PredictionReadModelService.noop)(implicit
    auth: JwtAuthenticator,
    clock: Clock,
    ec: ExecutionContext)
    extends Routes {

  val walletBalanceRoute = walletBalanceEndpoint.serverLogic { punterId => _ =>
    wallets
      .currentBalance(WalletId.deriveFrom(punterId))
      .leftMap((_: WalletNotFoundError) =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound))
      .value
  }

  val walletTransactionsRoute = walletTransactionsEndpoint.serverLogic { punterId =>
    {
      case (timeRange, reasons, products, pagination) =>
        val query = WalletTransactionsQuery(WalletId.deriveFrom(punterId), timeRange, reasons, products)
        wallets
          .walletTransactions(query, pagination)
          .flatMap { paginatedTransactions =>
            val predictionOrderIds = paginatedTransactions.data.flatMap { transaction =>
              transaction.betId
                .filter(_ => WalletProduct.fromReason(transaction.reason) == WalletProduct.Prediction)
                .map(_.value)
            }.toSet

            predictionHistoryLookup
              .predictionContextsForOrderIds(predictionOrderIds)
              .map(contexts =>
                Right(
                  paginatedTransactions.map(transaction =>
                    WalletTransactionView.fromWalletTransaction(
                      transaction,
                      transaction.betId.flatMap(betId => contexts.get(betId.value))))))
          }
    }
  }

  val responsibilityCheckAcceptanceRoute = responsibilityCheckAcceptanceEndpoint.serverLogic { punterId => _ =>
    wallets
      .acceptResponsibilityCheck(WalletId.deriveFrom(punterId))
      .leftMap((_: WalletNotFoundError) =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound))
      .value
  }

  override val endpoints: Routes.Endpoints =
    List(walletBalanceRoute, walletTransactionsRoute, responsibilityCheckAcceptanceRoute)
}
