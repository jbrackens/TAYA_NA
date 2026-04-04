package stella.rules.routes

import scala.util.Failure
import scala.util.Success
import scala.util.Try

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import sttp.model.StatusCode

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.routes.TapirAuthDirectives.ErrorOut

import stella.rules.routes.error.AdditionalPresentationErrorCode.AchievementRuleConfigurationNameAlreadyUsed
import stella.rules.routes.error.AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound
import stella.rules.routes.error.AdditionalPresentationErrorCode.AggregationRuleConfigurationNameAlreadyUsed
import stella.rules.routes.error.AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationFieldNotFound
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationFieldNotProvided
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationNameAlreadyUsed
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationNotFound
import stella.rules.services.RuleConfiguratorBoundedContext._

trait RuleConfiguratorRoutes {
  import RuleConfiguratorRoutes.log

  protected def handleEventConfigurationNotFoundError(e: EventConfigurationNotFoundError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(EventConfigurationNotFound)
    StatusCode.NotFound -> response
  }

  protected def handleEventConfigurationFieldNotFoundError(e: EventConfigurationFieldNotFoundError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = Response.asFailure(ErrorOutput.one(EventConfigurationFieldNotFound, e.errorMessage))
    StatusCode.BadRequest -> response
  }

  protected def handleEventConfigurationFieldNotProvidedError(e: EventConfigurationFieldNotProvidedError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = Response.asFailure(ErrorOutput.one(EventConfigurationFieldNotProvided, e.errorMessage))
    StatusCode.BadRequest -> response
  }

  protected def handleAggregationRuleConfigurationNotFoundError(
      e: AggregationRuleConfigurationNotFoundError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(AggregationRuleConfigurationNotFound)
    StatusCode.NotFound -> response
  }

  protected def handleAchievementRuleConfigurationNotFoundError(
      e: AchievementRuleConfigurationNotFoundError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(AchievementRuleConfigurationNotFound)
    StatusCode.NotFound -> response
  }

  protected def handleUnexpectedError(errorMessage: String, underlyingError: Throwable): ErrorOut = {
    log.error(errorMessage, underlyingError)
    val response = errorCodeResponse(PresentationErrorCode.InternalError)
    StatusCode.InternalServerError -> response
  }

  protected def handleUnexpectedFutureError[T](errorMessage: String)(
      futureResult: Try[Either[ErrorOut, T]]): Try[Either[ErrorOut, T]] =
    futureResult match {
      case _ @Success(_) => futureResult
      case Failure(e)    => Success(Left(handleUnexpectedError(errorMessage, e)))
    }

  protected def handleEventConfigurationNameAlreadyUsedError(e: EventConfigurationNameAlreadyUsedError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(EventConfigurationNameAlreadyUsed)
    StatusCode.Conflict -> response
  }

  protected def handleAggregationRuleConfigurationNameAlreadyUsedError(
      e: AggregationRuleConfigurationNameAlreadyUsedError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(AggregationRuleConfigurationNameAlreadyUsed)
    StatusCode.Conflict -> response
  }

  protected def handleAchievementRuleConfigurationNameAlreadyUsedError(
      e: AchievementRuleConfigurationNameAlreadyUsedError): ErrorOut = {
    log.trace(e.errorMessage)
    val response = errorCodeResponse(AchievementRuleConfigurationNameAlreadyUsed)
    StatusCode.Conflict -> response
  }

  protected def errorCodeResponse(code: PresentationErrorCode): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(code))
}

object RuleConfiguratorRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
