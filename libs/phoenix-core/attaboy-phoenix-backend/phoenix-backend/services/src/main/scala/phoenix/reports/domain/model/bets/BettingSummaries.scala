package phoenix.reports.domain.model.bets

import cats.kernel.Monoid

import phoenix.reports.domain.model.bets.BetEvent._

final case class OperatorBettingSummary(
    betsSold: BigDecimal,
    betsPaid: BigDecimal,
    betsCancelled: BigDecimal,
    betsVoided: BigDecimal,
    betsResettled: BigDecimal) {

  def revenue: BigDecimal = {
    betsSold - betsPaid - betsCancelled - betsVoided - betsResettled
  }

  def add(event: BetEvent): OperatorBettingSummary =
    event match {
      case betOpened: BetOpened       => copy(betsSold = betsSold + betOpened.betData.stake.amount)
      case betSettled: BetSettled     => copy(betsPaid = betsPaid + betSettled.paidAmount.amount)
      case betPushed: BetPushed       => copy(betsPaid = betsPaid + betPushed.betData.stake.amount)
      case betCancelled: BetCancelled => copy(betsCancelled = betsCancelled + betCancelled.betData.stake.amount)
      case betVoided: BetVoided       => copy(betsVoided = betsVoided + betVoided.betData.stake.amount)
      case betResettled: BetResettled =>
        copy(betsResettled =
          betsResettled + (betResettled.resettledAmount.amount - betResettled.unsettledAmount.amount))
    }

  def fromPunterPerspective: PunterBettingSummary =
    PunterBettingSummary(
      betsPlaced = betsSold,
      betsWon = betsPaid,
      betsCancelled = betsCancelled,
      betsVoided = betsVoided,
      betsResettled = betsResettled,
      winLoss = -revenue)
}
object OperatorBettingSummary {

  val empty: OperatorBettingSummary =
    OperatorBettingSummary(betsSold = 0, betsPaid = 0, betsCancelled = 0, betsVoided = 0, betsResettled = 0)

  def fromEvent(event: BetEvent): OperatorBettingSummary =
    empty.add(event)

  def aggregate(collection: Seq[OperatorBettingSummary]): OperatorBettingSummary =
    OperatorBettingSummary(
      betsSold = collection.map(_.betsSold).sum,
      betsPaid = collection.map(_.betsPaid).sum,
      betsCancelled = collection.map(_.betsCancelled).sum,
      betsVoided = collection.map(_.betsVoided).sum,
      betsResettled = collection.map(_.betsResettled).sum)

  implicit val monoid: Monoid[OperatorBettingSummary] =
    Monoid.instance(empty, (first, second) => aggregate(Seq(first, second)))
}

final case class PunterBettingSummary(
    betsPlaced: BigDecimal,
    betsWon: BigDecimal,
    betsCancelled: BigDecimal,
    betsVoided: BigDecimal,
    betsResettled: BigDecimal,
    winLoss: BigDecimal)

object PunterBettingSummary {
  val empty: PunterBettingSummary =
    PunterBettingSummary(betsPlaced = 0, betsWon = 0, betsCancelled = 0, betsVoided = 0, betsResettled = 0, winLoss = 0)
}
