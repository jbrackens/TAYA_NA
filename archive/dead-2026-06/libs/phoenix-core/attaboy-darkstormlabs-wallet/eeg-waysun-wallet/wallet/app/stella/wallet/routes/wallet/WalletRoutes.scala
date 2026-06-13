package stella.wallet.routes.wallet

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
import stella.wallet.services.WalletBoundedContext.Errors._

/** Combines endpoints definitions with their actual logic */
class WalletRoutes(boundedContext: WalletBoundedContext, serverInterpreter: PlayServerInterpreter)(implicit
    auth: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext)
    extends RoutesBase {

  import WalletRoutes.log

  lazy val routes: Routes =
    getBalances.orElse(getBalance).orElse(getBalancesAsAdmin).orElse(getBalanceAsAdmin).orElse(transferFundsAsAdmin)

  lazy val getBalances: Routes = {
    val endpoint = WalletEndpoints.getBalancesEndpoint.serverLogic { authContext => _ =>
      val projectId = getProjectId(authContext)
      val userId = getUserId(authContext)
      boundedContext
        .getBalances(projectId, userId)
        .bimap(
          { case e: UnexpectedWalletError =>
            handleUnexpectedError(
              s"Couldn't get wallet balances ${walletOperationLogDetailsSuffix(projectId, userId)}",
              e)
          },
          { balance =>
            log.trace(s"Fetched wallet balances ${walletOperationLogDetailsSuffix(projectId, userId)}")
            Response.asSuccess(balance)
          })
        .value
        .transform(handleUnexpectedFutureError(
          s"Couldn't get wallet balances ${walletOperationLogDetailsSuffix(projectId, userId)}"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getBalance: Routes = {
    val endpoint = WalletEndpoints.getBalanceEndpoint.serverLogic { authContext => currencyId =>
      val projectId = getProjectId(authContext)
      val walletOwnerId = getUserId(authContext)
      boundedContext
        .getBalance(projectId, walletOwnerId, currencyId)
        .bimap(
          {
            case e: CurrencyAssociatedWithProjectNotFoundError =>
              handleCurrencyAssociatedWithProjectNotFoundError(e)
            case e: UnexpectedWalletError =>
              handleUnexpectedError(
                s"Couldn't get wallet balance in currency $currencyId ${walletOperationLogDetailsSuffix(projectId, walletOwnerId)}",
                e)
          },
          { balance =>
            log.trace(
              s"Fetched wallet balance in currency $currencyId ${walletOperationLogDetailsSuffix(projectId, walletOwnerId)}")
            Response.asSuccess(balance)
          })
        .value
        .transform(handleUnexpectedFutureError(
          s"Couldn't get wallet balance in currency $currencyId ${walletOperationLogDetailsSuffix(projectId, walletOwnerId)}"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getBalancesAsAdmin: Routes = {
    val endpoint = WalletEndpoints.getBalancesAsAdminEndpoint.serverLogic { authContext => walletOwnerId =>
      val projectId = getProjectId(authContext)
      val adminId = getUserId(authContext)
      boundedContext
        .getBalances(projectId, walletOwnerId)
        .bimap(
          { case e: UnexpectedWalletError =>
            handleUnexpectedError(
              s"Couldn't get wallet balances ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}",
              e)
          },
          { json =>
            log.trace(
              s"Fetched wallet balances ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}")
            Response.asSuccess(json)
          })
        .value
        .transform(handleUnexpectedFutureError(
          s"Couldn't get wallet balances ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getBalanceAsAdmin: Routes = {
    val endpoint = WalletEndpoints.getBalanceAsAdminEndpoint.serverLogic { authContext =>
      { case (walletOwnerId, currencyId) =>
        val projectId = getProjectId(authContext)
        val adminId = getUserId(authContext)
        boundedContext
          .getBalance(projectId, walletOwnerId, currencyId)
          .bimap(
            {
              case e: CurrencyAssociatedWithProjectNotFoundError =>
                handleCurrencyAssociatedWithProjectNotFoundError(e)
              case e: UnexpectedWalletError =>
                handleUnexpectedError(
                  s"Couldn't get wallet balance in currency $currencyId ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}",
                  e)
            },
            { json =>
              log.trace(
                s"Fetched wallet balance in currency $currencyId ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}")
              Response.asSuccess(json)
            })
          .value
          .transform(handleUnexpectedFutureError(
            s"Couldn't get wallet balance in currency $currencyId ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val transferFundsAsAdmin: Routes = {
    val endpoint = WalletEndpoints.transferFundsAsAdminEndpoint.serverLogic { authContext =>
      { case (projectId, walletOwnerId, request) =>
        val adminId = getUserId(authContext)
        (for {
          _ <- authContext.verifyUserHasAccessToProject(projectId)
          _ <- boundedContext
            .transferFunds(projectId, adminId, walletOwnerId, request)
            .bimap(
              {
                case e: CurrencyAssociatedWithProjectNotFoundError =>
                  handleCurrencyAssociatedWithProjectNotFoundError(e)
                case e: InsufficientFundsError =>
                  handleInsufficientFundsError(e)
                case e: UnexpectedWalletError =>
                  handleUnexpectedError(
                    s"Couldn't transfer funds in currency ${request.currencyId} ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}",
                    e)
              },
              { _ =>
                log.trace(
                  s"Funds transferred in currency ${request.currencyId} ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}")
              })
        } yield ()).value.transform(handleUnexpectedFutureError(
          s"Couldn't transfer funds in currency ${request.currencyId} ${adminWalletOperationLogDetailsSuffix(adminId, projectId, walletOwnerId)}"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }
}

object WalletRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
