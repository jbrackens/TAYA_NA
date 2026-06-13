package phoenix.bets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import cats.data.EitherT
import cats.data.NonEmptyList
import cats.data.ValidatedNel
import cats.syntax.apply._

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetValidator._
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.http.core.Geolocation
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.SelectionOdds
import phoenix.punters.PunterEntity.PunterId
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.Funds.RealMoney

final class BetValidator(
    wallets: WalletsBoundedContext,
    markets: MarketsBoundedContext,
    geolocationValidator: GeolocationValidator,
    maximumAllowedStakeAmount: MaximumAllowedStakeAmount)(implicit ec: ExecutionContext) {

  def validateBet(
      betId: BetId,
      betData: BetData,
      geolocation: Geolocation): EitherT[Future, NonEmptyList[BetValidationError], ReservationId] =
    for {
      _ <- validateBet(betData, geolocation)
      reservationId <- tryToReserveFunds(betId, betData).leftMap(NonEmptyList.one[BetValidationError](_))
    } yield reservationId

  private def validateBet(
      betData: BetData,
      geolocation: Geolocation): EitherT[Future, NonEmptyList[BetValidationError], Unit] =
    for {
      _ <- validateBetSideEffectFreeRules(betData)
      _ <- validateBetSideEffectRules(betData, geolocation)
    } yield ()

  private def validateBetSideEffectFreeRules(
      betData: BetData): EitherT[Future, NonEmptyList[BetValidationError], Unit] =
    EitherT.cond(
      betData.stake.value.moneyAmount <= maximumAllowedStakeAmount.value,
      (),
      NonEmptyList.one[BetValidationError](BetValidator.StakeTooHigh(betData.stake)))

  private def validateBetSideEffectRules(
      betData: BetData,
      geolocation: Geolocation): EitherT[Future, NonEmptyList[BetValidationError], Unit] = {
    val marketSelectionValidation = checkIfMarketBettableWithSelection(betData)
    val geolocationValidation = checkIfGeolocationIsAllowed(geolocation)

    EitherT(for {
      marketSelectionOutcome <- marketSelectionValidation
      geolocationOutcome <- geolocationValidation
    } yield (marketSelectionOutcome, geolocationOutcome).mapN((_, _) => ()).toEither)
  }

  private def checkIfMarketBettableWithSelection(bet: BetData): Future[ValidationResult[SelectionOdds]] =
    markets
      .getDgeAllowedMarketState(bet.marketId)
      .leftMap(marketNotFound => MarketDoesNotExist(marketNotFound.id))
      .ensure(MarketNotBettable(bet.marketId))(market => market.isBettable)
      .subflatMap(market =>
        market.marketSelections
          .findSelection(bet.selectionId)
          .toRight(SelectionDoesNotExist(bet.marketId, bet.selectionId)))
      .ensureOr(selection => OddsHaveChangedError(bet.odds, selection.odds))(selection =>
        selection.odds.exists(_ == bet.odds))
      .toValidatedNel

  private def checkIfGeolocationIsAllowed(geolocation: Geolocation): Future[ValidationResult[Geolocation]] =
    EitherT
      .liftF(geolocationValidator.isValid(geolocation))
      .ensure(GeolocationNotAllowed(geolocation))(isValid => isValid)
      .map(_ => geolocation)
      .toValidatedNel

  private def tryToReserveFunds(id: BetId, betData: BetData): EitherT[Future, WalletReservationError, ReservationId] = {
    val walletId = WalletId.deriveFrom(betData.punterId)
    val bet = Bet(id, RealMoney(betData.stake.value), betData.odds)

    wallets.reserveForBet(walletId, bet).leftMap(WalletReservationError).map(_.reservationId)
  }
}

final case class MaximumAllowedStakeAmount(value: MoneyAmount)

object BetValidator {

  sealed trait BetValidationError extends Product with Serializable

  type ValidationResult[T] = ValidatedNel[BetValidationError, T]

  final case class PunterDoesNotExist(id: PunterId) extends BetValidationError
  final case class PunterCannotBetError(id: PunterId) extends BetValidationError

  final case class StakeTooHigh(stake: Stake) extends BetValidationError

  final case class MarketDoesNotExist(marketId: MarketId) extends BetValidationError
  final case class MarketNotBettable(marketId: MarketId) extends BetValidationError
  final case class SelectionDoesNotExist(marketId: MarketId, selectionId: SelectionId) extends BetValidationError
  final case class OddsHaveChangedError(previous: Odds, current: Option[Odds]) extends BetValidationError

  final case class WalletReservationError(error: ReservationError) extends BetValidationError

  final case class GeolocationNotAllowed(geolocation: Geolocation) extends BetValidationError
}
