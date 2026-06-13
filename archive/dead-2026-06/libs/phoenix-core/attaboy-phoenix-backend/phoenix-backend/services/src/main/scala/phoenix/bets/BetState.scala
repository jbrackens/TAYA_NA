package phoenix.bets

import java.time.OffsetDateTime

import scala.collection.immutable.IndexedSeq

import cats.data.Validated
import enumeratum.EnumEntry.UpperSnakecase
import enumeratum._
import io.circe.generic.extras.JsonKey

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetValidator.BetValidationError
import phoenix.bets.infrastructure.BetsAkkaSerializable
import phoenix.core.PotentialReturn
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.Validation.ValidationOps
import phoenix.core.validation.ValidationException
import phoenix.http.core.Geolocation
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

sealed trait BetState extends BetsAkkaSerializable {
  def getStatus: BetState.Status = BetState.getStatus(this)
}

object BetState {

  sealed trait Status extends EnumEntry with UpperSnakecase

  object Status extends Enum[Status] {
    override def values: IndexedSeq[Status] = findValues

    case object Uninitialized extends Status
    case object Open extends Status
    case object Failed extends Status
    case object Settled extends Status
    case object Resettled extends Status
    case object Voided extends Status
    case object Pushed extends Status
    case object Cancelled extends Status
  }

  def getStatus(state: BetState): Status =
    state match {
      case Uninitialized => Status.Uninitialized
      case _: Open       => Status.Open
      case _: Failed     => Status.Failed
      case _: Settled    => Status.Settled
      case _: Resettled  => Status.Resettled
      case _: Voided     => Status.Voided
      case _: Pushed     => Status.Pushed
      case _: Cancelled  => Status.Cancelled
    }
}

final case class BetData(
    punterId: PunterId,
    marketId: MarketId,
    selectionId: SelectionId,
    stake: Stake,
    @JsonKey("displayOdds") odds: Odds) {

  def punterStake: MoneyAmount = MoneyAmount(stake.value.amount)
  def potentialCompanyLoss: MoneyAmount = MoneyAmount(stake.value.amount * (odds.value - 1))
  def winnerFunds: MoneyAmount = PotentialReturn(stake, odds)
}

final case class Stake private (value: DefaultCurrencyMoney)
object Stake {
  def apply(rawAmount: DefaultCurrencyMoney): Validation[Stake] =
    Validated.condNel(rawAmount.amount > 0, new Stake(rawAmount), ValidationException("Stake needs to be positive"))

  def unsafe(raw: DefaultCurrencyMoney): Stake =
    apply(raw).toTryCombined.get
}

final case class CancellationReason private (value: String)
object CancellationReason {
  def apply(rawValue: String): Validation[CancellationReason] =
    Validated.condNel(
      rawValue.nonEmpty,
      new CancellationReason(rawValue),
      ValidationException("Cancellation Reason needs to be non empty."))

  def unsafe(rawValue: String): CancellationReason =
    apply(rawValue).toTryCombined.get
}

sealed trait HasBetData {
  val betData: BetData
}

case object Uninitialized extends BetState {
  def open(betId: BetId, betData: BetData, reservationId: ReservationId, geolocation: Geolocation): BetState =
    Open(betId: BetId, betData: BetData, reservationId, geolocation)

  def fail(betId: BetId, betData: BetData, reasons: List[BetValidationError]): BetState =
    Failed(betId, betData, reasons)
}
final case class Open(betId: BetId, betData: BetData, reservationId: ReservationId, geolocation: Geolocation)
    extends BetState
    with HasBetData {
  def void(): BetState =
    Voided(betId, betData)

  def push(): BetState = Pushed(betId, betData)

  def cancel(
      adminUser: AdminId,
      cancellationReason: CancellationReason,
      betCancellationTimestamp: OffsetDateTime): BetState =
    Cancelled(betId, betData, adminUser, cancellationReason, betCancellationTimestamp)

  def settle(isWinner: Boolean): BetState =
    Settled(betId, betData, isWinner)
}
final case class Failed(betId: BetId, betData: BetData, reasons: List[BetValidationError])
    extends BetState
    with HasBetData
final case class Settled(betId: BetId, betData: BetData, isWinner: Boolean) extends BetState with HasBetData {
  def resettle(isWinner: Boolean): BetState =
    Resettled(betId, betData, isWinner)
}
final case class Resettled(betId: BetId, betData: BetData, isWinner: Boolean) extends BetState with HasBetData
final case class Voided(betId: BetId, betData: BetData) extends BetState with HasBetData
final case class Pushed(betId: BetId, betData: BetData) extends BetState with HasBetData
final case class Cancelled(
    betId: BetId,
    betData: BetData,
    adminUser: AdminId,
    cancellationReason: CancellationReason,
    betCancellationTimestamp: OffsetDateTime)
    extends BetState
    with HasBetData
