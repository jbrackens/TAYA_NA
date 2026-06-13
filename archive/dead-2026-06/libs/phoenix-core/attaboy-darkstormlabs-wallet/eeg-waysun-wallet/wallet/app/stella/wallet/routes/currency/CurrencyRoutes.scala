package stella.wallet.routes.currency

import scala.concurrent.ExecutionContext

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import play.api.routing.Router.Routes
import sttp.tapir.server.play.PlayServerInterpreter

import stella.common.http.Response
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.models.Ids.ProjectId

import stella.wallet.routes._
import stella.wallet.services.WalletBoundedContext
import stella.wallet.services.WalletBoundedContext.Errors.CurrencyAssociatedWithProjectNotFoundError
import stella.wallet.services.WalletBoundedContext.Errors.CurrencyNotFoundError

/** Combines endpoints definitions with their actual logic */
class CurrencyRoutes(boundedContext: WalletBoundedContext, serverInterpreter: PlayServerInterpreter)(implicit
    auth: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext)
    extends RoutesBase {

  import CurrencyRoutes.log

  lazy val routes: Routes =
    getCurrencies
      .orElse(getCurrency)
      .orElse(getCurrenciesAsAdmin)
      .orElse(getCurrencyAsAdmin)
      .orElse(getCurrenciesAsSuperAdmin)
      .orElse(getCurrencyAsSuperAdmin)
      .orElse(createCurrencyAsAdmin)
      .orElse(createCurrencyAsSuperAdmin)
      .orElse(updateCurrencyAsAdmin)
      .orElse(updateCurrencyAsSuperAdmin)
      .orElse(deleteCurrencyFromProjectAsAdmin)

  lazy val getCurrencies: Routes = {
    val endpoint = CurrencyEndpoints.getCurrenciesEndpoint.serverLogic { authContext => _ =>
      val projectId = getProjectId(authContext)
      val userId = getUserId(authContext)
      boundedContext
        .getCurrenciesAssociatedWithProject(projectId)
        .map { currencies =>
          log.trace(s"Fetched project $projectId currencies as user $userId")
          Right(Response.asSuccess(currencies))
        }
        .transform(handleUnexpectedFutureError(s"Couldn't get project $projectId currencies as user $userId"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getCurrency: Routes = {
    val endpoint = CurrencyEndpoints.getCurrencyEndpoint.serverLogic { authContext => currencyId =>
      val projectId = getProjectId(authContext)
      val userId = getUserId(authContext)
      boundedContext
        .getCurrencyAssociatedWithProject(projectId, currencyId)
        .bimap(
          { case e: CurrencyAssociatedWithProjectNotFoundError =>
            handleCurrencyAssociatedWithProjectNotFoundError(e)
          },
          { currency =>
            log.trace(s"Fetched project $projectId currency $currencyId as user $userId")
            Response.asSuccess(currency)
          })
        .value
        .transform(handleUnexpectedFutureError(s"Couldn't get project $projectId currency $currencyId as user $userId"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getCurrenciesAsAdmin: Routes = {
    val endpoint = CurrencyEndpoints.getCurrenciesAsAdminEndpoint.serverLogic { authContext => _ =>
      val projectId = getProjectId(authContext)
      val userId = getUserId(authContext)
      boundedContext
        .getCurrenciesAssociatedWithProject(projectId)
        .map { currencies =>
          log.trace(s"Fetched project $projectId currencies as user $userId")
          Right(Response.asSuccess(currencies))
        }
        .transform(handleUnexpectedFutureError(s"Couldn't get project $projectId currencies as user $userId"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getCurrencyAsAdmin: Routes = {
    val endpoint = CurrencyEndpoints.getCurrencyAsAdminEndpoint.serverLogic { authContext => currencyId =>
      val projectId = getProjectId(authContext)
      val adminId = getUserId(authContext)
      boundedContext
        .getCurrencyAssociatedWithProject(projectId, currencyId)
        .bimap(
          { case e: CurrencyAssociatedWithProjectNotFoundError =>
            handleCurrencyAssociatedWithProjectNotFoundError(e)
          },
          { currency =>
            log.trace(s"Fetched project $projectId currency $currencyId as admin $adminId")
            Response.asSuccess(currency)
          })
        .value
        .transform(
          handleUnexpectedFutureError(s"Couldn't get project $projectId currency $currencyId as admin $adminId"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getCurrenciesAsSuperAdmin: Routes = {
    val endpoint = CurrencyEndpoints.getCurrenciesAsSuperAdminEndpoint.serverLogic { authContext => projectIdOpt =>
      val adminProjectId = getProjectId(authContext)
      val adminId = getUserId(authContext)
      projectIdOpt match {
        case Some(projectId) =>
          boundedContext
            .getCurrenciesAssociatedWithProject(projectId)
            .map { currencies =>
              log.trace(s"Fetched project $projectId currencies as super admin $adminId from project $adminProjectId")
              Right(Response.asSuccess(currencies))
            }
            .transform(handleUnexpectedFutureError(
              s"Couldn't get project $projectId currencies as super admin $adminId from project $adminProjectId"))
        case None =>
          boundedContext
            .getAllCurrencies()
            .map { currencies =>
              log.trace(s"Fetched all currencies as super admin $adminId from project $adminProjectId")
              Right(Response.asSuccess(currencies))
            }
            .transform(handleUnexpectedFutureError(
              s"Couldn't get all currencies as super admin $adminId from project $adminProjectId"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getCurrencyAsSuperAdmin: Routes = {
    val endpoint = CurrencyEndpoints.getCurrencyAsSuperAdminEndpoint.serverLogic { authContext => currencyId =>
      val adminProjectId = getProjectId(authContext)
      val adminId = getUserId(authContext)
      boundedContext
        .getCurrency(currencyId)
        .bimap(
          { case e: CurrencyNotFoundError =>
            handleCurrencyNotFoundError(e)
          },
          { currency =>
            log.trace(s"Fetched currency $currencyId as super admin $adminId from project $adminProjectId")
            Response.asSuccess(currency)
          })
        .value
        .transform(handleUnexpectedFutureError(
          s"Couldn't get currency $currencyId as super admin $adminId from project $adminProjectId"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val createCurrencyAsAdmin: Routes = {
    val endpoint = CurrencyEndpoints.createCurrencyAsAdminEndpoint.serverLogic { authContext => request =>
      val projectId = getProjectId(authContext)
      val adminId = getUserId(authContext)
      boundedContext
        .createCurrencyWithAssociatedProjects(
          request,
          projectId,
          adminId,
          restrictedToProjectIds = Some(allAllowedProjectIds(authContext)))
        .map { currency =>
          log.trace(s"Created currency ${currency.id} in project $projectId as admin $adminId")
          Right(Response.asSuccess(currency))
        }
        .transform(handleUnexpectedFutureError(s"Couldn't create currency in project $projectId as admin $adminId"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val createCurrencyAsSuperAdmin: Routes = {
    val endpoint = CurrencyEndpoints.createCurrencyAsSuperAdminEndpoint.serverLogic { authContext => request =>
      val projectId = getProjectId(authContext)
      val adminId = getUserId(authContext)
      boundedContext
        .createCurrencyWithAssociatedProjects(request, projectId, adminId, restrictedToProjectIds = None)
        .map { currency =>
          log.trace(s"Created currency ${currency.id} as super admin $adminId from project $projectId")
          Right(Response.asSuccess(currency))
        }
        .transform(
          handleUnexpectedFutureError(s"Couldn't create currency as super admin $adminId from project $projectId"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val updateCurrencyAsAdmin: Routes = {
    val endpoint = CurrencyEndpoints.updateCurrencyAsAdminEndpoint.serverLogic { authContext =>
      { case (currencyId, request) =>
        val projectId = getProjectId(authContext)
        val adminId = getUserId(authContext)
        boundedContext
          .updateCurrencyWithAssociatedProjects(
            currencyId,
            request,
            projectId,
            adminId,
            restrictedToProjectIds = Some(allAllowedProjectIds(authContext)))
          .bimap(
            { case e: CurrencyNotFoundError =>
              handleCurrencyNotFoundError(e)
            },
            { currency =>
              log.trace(s"Updated currency $currencyId in project $projectId as admin $adminId")
              Response.asSuccess(currency)
            })
          .value
          .transform(handleUnexpectedFutureError(
            s"Couldn't update currency $currencyId in project $projectId as admin $adminId"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val updateCurrencyAsSuperAdmin: Routes = {
    val endpoint = CurrencyEndpoints.updateCurrencyAsSuperAdminEndpoint.serverLogic { authContext =>
      { case (currencyId, request) =>
        val projectId = getProjectId(authContext)
        val adminId = getUserId(authContext)
        boundedContext
          .updateCurrencyWithAssociatedProjects(currencyId, request, projectId, adminId, restrictedToProjectIds = None)
          .bimap(
            { case e: CurrencyNotFoundError =>
              handleCurrencyNotFoundError(e)
            },
            { currency =>
              log.trace(s"Updated currency $currencyId as super admin $adminId from project $projectId")
              Response.asSuccess(currency)
            })
          .value
          .transform(handleUnexpectedFutureError(
            s"Couldn't update currency $currencyId as super admin $adminId from project $projectId"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteCurrencyFromProjectAsAdmin: Routes = {
    val endpoint = CurrencyEndpoints.deleteCurrencyFromProjectAsAdminEndpoint.serverLogic { authContext =>
      { case (projectId, currencyId) =>
        val adminId = getUserId(authContext)
        (for {
          _ <- authContext.verifyUserHasAccessToProject(projectId)
          _ <- boundedContext
            .deleteCurrencyProjectAssociation(projectId, currencyId, adminId)
            .bimap(
              { case e: CurrencyAssociatedWithProjectNotFoundError =>
                handleCurrencyAssociatedWithProjectNotFoundError(e)
              },
              { _ =>
                log.trace(s"Removed currency $currencyId from project $projectId as admin $adminId")
              })
        } yield ()).value.transform(handleUnexpectedFutureError(
          s"Couldn't remove currency $currencyId from project $projectId as admin $adminId"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  private def allAllowedProjectIds(authContext: StellaAuthContext): Set[ProjectId] = {
    (authContext.additionalProjectIds + authContext.primaryProjectId).map(ProjectId.apply)
  }
}

object CurrencyRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
