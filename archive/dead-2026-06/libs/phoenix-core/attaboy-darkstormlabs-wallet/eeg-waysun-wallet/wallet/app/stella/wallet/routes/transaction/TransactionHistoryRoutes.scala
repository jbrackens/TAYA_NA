package stella.wallet.routes.transaction

import scala.concurrent.ExecutionContext

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import play.api.routing.Router.Routes
import sttp.tapir.server.play.PlayServerInterpreter

import stella.common.http.Response
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext

import stella.wallet.routes.RoutesBase
import stella.wallet.services.WalletBoundedContext
import stella.wallet.services.WalletBoundedContext.Errors.CurrencyAssociatedWithProjectNotFoundError

/** Combines endpoints definitions with their actual logic */
class TransactionHistoryRoutes(boundedContext: WalletBoundedContext, serverInterpreter: PlayServerInterpreter)(implicit
    auth: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext)
    extends RoutesBase {

  import TransactionHistoryRoutes.log

  lazy val routes: Routes =
    getTransactionHistory.orElse(getTransactionsAsAdmin)

  lazy val getTransactionHistory: Routes = {
    val endpoint = TransactionHistoryEndpoints.getTransactionHistoryEndpoint.serverLogic { authContext =>
      { case (currencyId, transactionTypes, dateRangeStart, dateRangeEnd, sortFromNewestToOldest) =>
        val projectId = getProjectId(authContext)
        val walletOwnerId = getUserId(authContext)
        boundedContext
          .getTransactionHistory(
            projectId,
            walletOwnerId,
            currencyId,
            transactionTypes,
            dateRangeStart,
            dateRangeEnd,
            sortFromNewestToOldest)
          .bimap(
            { case e: CurrencyAssociatedWithProjectNotFoundError =>
              handleCurrencyAssociatedWithProjectNotFoundError(e)
            },
            { transactions =>
              log.trace(s"Fetched transaction history ${walletOperationLogDetailsSuffix(projectId, walletOwnerId)}")
              Response.asSuccess(transactions)
            })
          .value
          .transform(
            handleUnexpectedFutureError(
              s"Couldn't get transaction history for currency $currencyId, " +
              s"transaction types [${transactionTypes.mkString(", ")}] and date range from $dateRangeStart to " +
              s"$dateRangeEnd ${walletOperationLogDetailsSuffix(projectId, walletOwnerId)}"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getTransactionsAsAdmin: Routes = {
    val endpoint = TransactionHistoryEndpoints.getTransactionHistoryAsAdminEndpoint.serverLogic { authContext =>
      { case (walletOwnerId, currencyId, transactionTypes, dateRangeStart, dateRangeEnd, sortFromNewestToOldest) =>
        val projectId = getProjectId(authContext)
        val adminId = getUserId(authContext)
        boundedContext
          .getTransactionHistory(
            projectId,
            walletOwnerId,
            currencyId,
            transactionTypes,
            dateRangeStart,
            dateRangeEnd,
            sortFromNewestToOldest)
          .bimap(
            { case e: CurrencyAssociatedWithProjectNotFoundError =>
              handleCurrencyAssociatedWithProjectNotFoundError(e)
            },
            { transactions =>
              log.trace(
                s"Fetched transaction history ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}")
              Response.asSuccess(transactions)
            })
          .value
          .transform(
            handleUnexpectedFutureError(
              s"Couldn't get transaction history for currency $currencyId, " +
              s"transaction types [${transactionTypes.mkString(", ")}] and date range from $dateRangeStart to " +
              s"$dateRangeEnd ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

}

object TransactionHistoryRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
