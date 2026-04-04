package phoenix.bets.infrastructure.http

import scala.concurrent.ExecutionContext

import akka.http.scaladsl.model.StatusCodes
import cats.syntax.traverse._
import org.slf4j.LoggerFactory
import sttp.model.StatusCode

import phoenix.bets.BetStateUpdate
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetHistoryQuery
import phoenix.bets.BetsDomainConfig
import phoenix.bets.GeolocationValidator
import phoenix.bets.application.BatchBetPlacementError
import phoenix.bets.application.BetPlacementAttemptId
import phoenix.bets.application.BetPlacementError
import phoenix.bets.application.PlaceBetError
import phoenix.bets.application.PlaceBets
import phoenix.bets.application.SuccessfulBetPlacement
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.domain.PunterStakeRepository
import phoenix.bets.infrastructure.http.BetEndpoints.betHistoryEndpoint
import phoenix.bets.infrastructure.http.BetEndpoints.betStatusEndpoint
import phoenix.bets.infrastructure.http.BetEndpoints.placeBetEndpoint
import phoenix.core.Clock
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core._
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.MarketsBoundedContext
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletsBoundedContext

final class BetRoutes(
    bets: BetsBoundedContext,
    wallets: WalletsBoundedContext,
    markets: MarketsBoundedContext,
    punters: PuntersBoundedContext,
    marketBetsRepository: MarketBetsRepository,
    punterStakeRepository: PunterStakeRepository,
    geolocationValidator: GeolocationValidator,
    betsDomainConfig: BetsDomainConfig)(implicit auth: JwtAuthenticator, ec: ExecutionContext, clock: Clock)
    extends Routes {

  private val log = LoggerFactory.getLogger(getClass)

  val placeBetsUseCase =
    new PlaceBets(
      bets,
      wallets,
      markets,
      punters,
      marketBetsRepository,
      punterStakeRepository,
      geolocationValidator,
      betsDomainConfig.maximumAllowedStakeAmount,
      clock)

  def adaptSingleBetPlacementResult(singleResult: Either[BetPlacementError, SuccessfulBetPlacement]): PlaceBetResponse =
    singleResult match {
      case Left(betPlacementError) =>
        PlaceBetResponse.failure(
          betPlacementError.betPlacementAttemptId,
          betPlacementError.error match {
            case PlaceBetError.InvalidBetPlacement(_) => PresentationErrorCode.UnableToOpenBet
            case PlaceBetError.UnexpectedBetState     => PresentationErrorCode.UnexpectedBetState
          })
      case Right(successfulBetPlacement) =>
        PlaceBetResponse.success(successfulBetPlacement.betPlacementAttemptId)
    }

  val placeBetsRoute = {

    placeBetEndpoint(punters).serverLogic { punterId =>
      {
        case (maybeGeolocation, requests) =>
          GeolocationHeader.ensureHeader(maybeGeolocation) { geolocation =>
            placeBetsUseCase
              .placeBets(punterId, requests, geolocation)
              .map(_.map(adaptSingleBetPlacementResult))
              .leftMap {
                case BatchBetPlacementError.PunterProfileDoesNotExist =>
                  ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
                case BatchBetPlacementError.PunterNeedsToAcceptResponsibilityCheck =>
                  ErrorResponse.tupled(
                    StatusCode.BadRequest,
                    PresentationErrorCode.PunterNeedsToAcceptResponsibilityCheck)
                case BatchBetPlacementError.WalletNotFound =>
                  ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.WalletNotFound)
                case BatchBetPlacementError.StakeLimitsHaveBeenBreached =>
                  ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.StakeLimitsHaveBeenBreached)
              }
              .value
          }
      }
    }
  }

  val betStatusRoute = betStatusEndpoint(punters).serverLogic { _ => request =>
    request.betIds
      .flatTraverse(
        bets
          .betDetails(_)
          .fold(
            error => {
              log.info(s"Skipping missing bet details. Error: $error")
              List.empty
            },
            betDetails => List(BetStateUpdate.fromBetDetails(betDetails))))
      .map(Right(_))
  }

  val betHistoryRoute = betHistoryEndpoint(punters).serverLogic { punterId =>
    {
      case (timeRange, statuses, outcome, pagination) =>
        val betQuery = BetHistoryQuery(Some(timeRange), statuses, outcome, pagination)
        bets.searchForBets(punterId, betQuery).map(Right.apply)
    }
  }

  override def endpoints: Routes.Endpoints = List(placeBetsRoute, betHistoryRoute, betStatusRoute)
}

sealed trait PlaceBetResponse
final case class PlaceBetSuccess(betPlacementAttemptId: BetPlacementAttemptId, responseCode: Int)
    extends PlaceBetResponse
final case class PlaceBetFailure(
    betPlacementAttemptId: BetPlacementAttemptId,
    responseCode: Int,
    errorCode: PresentationErrorCode)
    extends PlaceBetResponse

object PlaceBetResponse {
  val SuccessCode = BigDecimal(StatusCodes.Accepted.intValue)
  val FailureCode = BigDecimal(StatusCodes.InternalServerError.intValue)

  def success(betPlacementAttemptId: BetPlacementAttemptId): PlaceBetResponse =
    PlaceBetSuccess(betPlacementAttemptId, SuccessCode.intValue)

  def failure(betPlacementAttemptId: BetPlacementAttemptId, errorCode: PresentationErrorCode): PlaceBetResponse =
    PlaceBetFailure(betPlacementAttemptId, FailureCode.intValue, errorCode)
}
