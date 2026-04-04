package phoenix.bets.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.NonEmptyList
import cats.instances.future._

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetValidator
import phoenix.bets.BetValidator.BetValidationError
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.GeolocationValidator
import phoenix.bets.MaximumAllowedStakeAmount
import phoenix.bets.application.PlaceBetError.InvalidBetPlacement
import phoenix.bets.domain.MarketBet
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.domain.PunterStake
import phoenix.bets.domain.PunterStakeRepository
import phoenix.core.Clock
import phoenix.http.core.Geolocation
import phoenix.markets.MarketsBoundedContext
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol

final class PlaceBet(
    bets: BetsBoundedContext,
    wallets: WalletsBoundedContext,
    markets: MarketsBoundedContext,
    marketBetsRepository: MarketBetsRepository,
    punterStakeRepository: PunterStakeRepository,
    geolocationValidator: GeolocationValidator,
    maximumAllowedStakeAmount: MaximumAllowedStakeAmount,
    clock: Clock)(implicit ec: ExecutionContext) {

  private val betValidator = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

  def placeBet(betId: BetId, betData: BetData, geolocation: Geolocation): EitherT[Future, PlaceBetError, Unit] =
    betValidator
      .validateBet(betId, betData, geolocation)
      .biflatMap(
        errors => handleValidationErrors(betId, betData, errors),
        reservationId => createBet(betId, betData, geolocation, reservationId))

  private def handleValidationErrors(
      betId: BetId,
      betData: BetData,
      validationErrors: NonEmptyList[BetValidationError]): EitherT[Future, PlaceBetError, Unit] = {
    bets
      .failBet(betId, betData, validationErrors)
      .biflatMap(
        (_: BetsBoundedContext.UnexpectedStateError) => EitherT.leftT(PlaceBetError.UnexpectedBetState),
        _ => EitherT.leftT(InvalidBetPlacement(validationErrors)))
  }

  private def createBet(
      betId: BetId,
      betData: BetData,
      geolocation: Geolocation,
      reservationId: WalletsBoundedContextProtocol.ReservationId): EitherT[Future, PlaceBetError, Unit] = {
    val placedAt = clock.currentOffsetDateTime()
    for {
      _ <-
        bets
          .openBet(betId, betData, geolocation, reservationId, placedAt = placedAt)
          .leftMap((_: BetsBoundedContext.UnexpectedStateError) => PlaceBetError.UnexpectedBetState)
      // TODO (PHXD-999): fix eventual consistency when settling/cancelling all bets for a given market
      _ <- EitherT.liftF(marketBetsRepository.save(MarketBet(betId, betData.marketId, BetStatus.Open)))
      _ <- EitherT.liftF(
        punterStakeRepository.insert(
          PunterStake(
            betId,
            betData.punterId,
            betData.stake,
            betData.odds,
            placedAt = placedAt,
            betStatus = BetStatus.Open,
            outcome = None)))
    } yield ()

  }
}

sealed trait PlaceBetError
object PlaceBetError {
  final case class InvalidBetPlacement(errors: NonEmptyList[BetValidationError]) extends PlaceBetError
  case object UnexpectedBetState extends PlaceBetError
}
