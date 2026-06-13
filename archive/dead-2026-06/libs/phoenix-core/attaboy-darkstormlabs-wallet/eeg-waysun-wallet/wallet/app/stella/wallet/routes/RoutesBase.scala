package stella.wallet.routes

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import sttp.model.StatusCode

import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.RoutesResponseHelper
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.routes.error.AdditionalPresentationErrorCode
import stella.wallet.services.WalletBoundedContext.Errors._

trait RoutesBase extends RoutesResponseHelper {
  import RoutesBase.log

  protected def getProjectId(authContext: StellaAuthContext): ProjectId = ProjectId(authContext.primaryProjectId)

  protected def getUserId(authContext: StellaAuthContext): UserId = UserId(authContext.userId)

  protected def handleCurrencyAssociatedWithProjectNotFoundError(
      e: CurrencyAssociatedWithProjectNotFoundError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(AdditionalPresentationErrorCode.ProjectCurrencyNotFound)
    StatusCode.NotFound -> response
  }

  protected def handleCurrencyNotFoundError(e: CurrencyNotFoundError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(AdditionalPresentationErrorCode.CurrencyNotFound)
    StatusCode.NotFound -> response
  }

  protected def handleUnexpectedError(errorMessage: String, error: UnexpectedWalletError): ErrorOut = {
    val messageWithDetails = s"$errorMessage Details: ${error.details}"
    error.underlying match {
      case Some(err) => log.error(messageWithDetails, err)
      case None      => log.error(messageWithDetails)
    }
    val response = errorCodeResponse(PresentationErrorCode.InternalError)
    StatusCode.InternalServerError -> response
  }

  protected def handleInsufficientFundsError(e: InsufficientFundsError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(AdditionalPresentationErrorCode.InsufficientFunds)
    StatusCode.Conflict -> response
  }

  protected def adminWalletOperationLogDetailsSuffix(adminId: UserId, projectId: ProjectId, userId: UserId): String =
    s"as admin $adminId ${walletOperationLogDetailsSuffix(projectId, userId)}"

  protected def walletOperationLogDetailsSuffix(projectId: ProjectId, userId: UserId): String =
    s"for project $projectId and user $userId"
}

object RoutesBase {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
