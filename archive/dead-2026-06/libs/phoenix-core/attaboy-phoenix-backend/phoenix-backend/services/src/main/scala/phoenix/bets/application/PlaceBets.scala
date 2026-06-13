package phoenix.bets.application

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.BetRequest
import phoenix.bets.BetsBoundedContext
import phoenix.bets.GeolocationValidator
import phoenix.bets.MaximumAllowedStakeAmount
import phoenix.bets.application.BatchBetPlacementError.StakeLimitsHaveBeenBreached
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.domain.PunterStake
import phoenix.bets.domain.PunterStakeRepository
import phoenix.bets.domain.StakeLimitsLogic
import phoenix.core.Clock
import phoenix.http.core.Geolocation
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.domain.ResponsibilityCheckStatus.hasToAcceptResponsibilityCheck

final class PlaceBets(
    bets: BetsBoundedContext,
    wallets: WalletsBoundedContext,
    markets: MarketsBoundedContext,
    punters: PuntersBoundedContext,
    marketBetsRepository: MarketBetsRepository,
    punterStakeRepository: PunterStakeRepository,
    geolocationValidator: GeolocationValidator,
    maximumAllowedStakeAmount: MaximumAllowedStakeAmount,
    clock: Clock)(implicit ec: ExecutionContext) {

  private val placeBetUseCase =
    new PlaceBet(
      bets,
      wallets,
      markets,
      marketBetsRepository,
      punterStakeRepository,
      geolocationValidator,
      maximumAllowedStakeAmount,
      clock)
  private val stakeLimitsBatchValidation = new StakeLimitsBatchValidation(punters, punterStakeRepository, clock)

  private type IndividualPlacementResult = Either[BetPlacementError, SuccessfulBetPlacement]
  private type BatchBetPlacementResult = List[IndividualPlacementResult]

  def placeBets(
      punterId: PunterId,
      requests: List[BetRequest],
      geolocation: Geolocation): EitherT[Future, BatchBetPlacementError, BatchBetPlacementResult] = {
    val now = clock.currentOffsetDateTime()
    for {
      _ <- preventPuntersThatNeedToAcceptResponsibilityCheck(punterId)
      _ <- stakeLimitsBatchValidation.preventBreachingStakeLimits(punterId, requests, now)
      batchPlacementResult <- EitherT.liftF(placeAllBets(punterId, requests, geolocation))
    } yield batchPlacementResult
  }

  def preventPuntersThatNeedToAcceptResponsibilityCheck(
      punterId: PunterId): EitherT[Future, BatchBetPlacementError, Unit] = {
    for {
      responsibilityCheck <-
        wallets
          .findResponsibilityCheckStatus(WalletId.deriveFrom(punterId))
          .leftMap((_: WalletNotFoundError) => BatchBetPlacementError.WalletNotFound)
      _ <-
        EitherT
          .cond[Future](
            !hasToAcceptResponsibilityCheck(responsibilityCheck),
            (),
            BatchBetPlacementError.PunterNeedsToAcceptResponsibilityCheck)
          .leftWiden[BatchBetPlacementError]
    } yield ()

  }

  private def placeAllBets(
      punterId: PunterId,
      requests: List[BetRequest],
      geolocation: Geolocation): Future[BatchBetPlacementResult] =
    Future.sequence(requests.map(placeBetRequest => placeSingleBet(punterId, placeBetRequest, geolocation)))

  private def placeSingleBet(
      punterId: PunterId,
      placeBetRequest: BetRequest,
      geolocation: Geolocation): Future[Either[BetPlacementError, SuccessfulBetPlacement]] = {
    val betId = BetId.random()
    val betPlacementAttemptId = BetPlacementAttemptId(betId, placeBetRequest.marketId, placeBetRequest.selectionId)
    val betData =
      BetData(
        punterId,
        placeBetRequest.marketId,
        placeBetRequest.selectionId,
        placeBetRequest.stake,
        placeBetRequest.odds)
    placeBetUseCase.placeBet(betId, betData, geolocation).value.map {
      case Left(failureReason) => Left(BetPlacementError(betPlacementAttemptId, failureReason))
      case Right(())           => Right(SuccessfulBetPlacement(betPlacementAttemptId, betId))
    }
  }
}

private class StakeLimitsBatchValidation(
    puntersBoundedContext: PuntersBoundedContext,
    punterStakeRepository: PunterStakeRepository,
    clock: Clock) {
  def preventBreachingStakeLimits(punterId: PunterId, requests: List[BetRequest], now: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, BatchBetPlacementError, Unit] =
    for {
      stakeLimits <-
        puntersBoundedContext
          .getPunterProfile(punterId)
          .leftMap((_: PunterProfileDoesNotExist) => BatchBetPlacementError.PunterProfileDoesNotExist)
          .map(_.stakeLimits)
      punterStakeHistory <- EitherT.liftF(findRelevantPunterStakeHistory(punterId, now))
      _ <- EitherT.cond[Future][BatchBetPlacementError, Unit](
        !StakeLimitsLogic.haveLimitsBeenBreached(stakeLimits, punterStakeHistory, requests, now, clock),
        (),
        StakeLimitsHaveBeenBreached)
    } yield ()

  private def findRelevantPunterStakeHistory(punterId: PunterId, now: OffsetDateTime): Future[List[PunterStake]] =
    punterStakeRepository.findMoreRecentThan(
      punterId,
      recencyThreshold = StakeLimitsLogic.calculateDateOfOldestApplicablePunterStake(now))
}

sealed trait BatchBetPlacementError
object BatchBetPlacementError {
  case object WalletNotFound extends BatchBetPlacementError
  case object PunterNeedsToAcceptResponsibilityCheck extends BatchBetPlacementError
  case object PunterProfileDoesNotExist extends BatchBetPlacementError
  case object StakeLimitsHaveBeenBreached extends BatchBetPlacementError
}

final case class BetPlacementAttemptId(betId: BetId, marketId: MarketId, selectionId: SelectionId)

final case class SuccessfulBetPlacement(betPlacementAttemptId: BetPlacementAttemptId, betId: BetId)

final case class BetPlacementError(betPlacementAttemptId: BetPlacementAttemptId, error: PlaceBetError)
