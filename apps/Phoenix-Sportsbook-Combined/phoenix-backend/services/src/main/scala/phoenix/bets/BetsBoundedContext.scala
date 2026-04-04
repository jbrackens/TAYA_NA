package phoenix.bets

import java.time.OffsetDateTime

import scala.collection.immutable.IndexedSeq
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.NonEmptyList
import enumeratum.EnumEntry.UpperSnakecase
import enumeratum._
import io.circe.generic.extras.JsonKey

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetValidator.BetValidationError
import phoenix.bets.BetsBoundedContext.BetOutcome.Lost
import phoenix.bets.BetsBoundedContext.BetOutcome.Won
import phoenix.bets.BetsBoundedContext._
import phoenix.core.Clock
import phoenix.core.odds.Odds
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.http.core.Geolocation
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.markets.MarketsBoundedContext.MarketAggregate.CompetitorSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.FixtureSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.MarketSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SelectionSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SportSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.TournamentSummary
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

trait BetsBoundedContext {
  def openBet(
      id: BetId,
      betData: BetData,
      geolocation: Geolocation,
      reservationId: ReservationId,
      placedAt: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit]

  def failBet(id: BetId, betData: BetData, reasons: NonEmptyList[BetValidationError])(implicit
      ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit]

  def betDetails(id: BetId)(implicit ec: ExecutionContext): EitherT[Future, BetDetailsError, BetDetails]

  def settleBets(marketId: MarketId, winningSelectionId: SelectionId)(implicit
      ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit]

  def resettleBets(marketId: MarketId, newWinningSelectionId: SelectionId, resettledAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit]

  def voidBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetVoidingError, Unit]

  def pushBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetPushingError, Unit]

  def cancelBet(
      betId: BetId,
      adminUser: AdminId,
      cancellationReason: CancellationReason,
      betCancellationTimestamp: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, BetCancellationError, Unit]

  def cancelUnsettledBets(punterId: PunterId, cancellationReason: CancellationReason)(implicit
      ec: ExecutionContext,
      clock: Clock): EitherT[Future, BetCancellationError, Unit]

  def searchForBets(punterId: PunterId, query: BetHistoryQuery)(implicit
      ec: ExecutionContext): Future[PaginatedResult[BetView]]
}

object BetsBoundedContext {

  case class BetDetails(
      betId: BetId,
      status: BetState.Status,
      punterId: PunterId,
      marketId: MarketId,
      selectionId: String,
      stake: Stake,
      odds: Odds,
      isWinner: Boolean,
      failureReasons: List[BetValidationError])

  final case class BetHistory(
      punter: PunterId,
      bet: BetSummary,
      sport: SportSummary,
      tournament: TournamentSummary,
      fixture: FixtureSummary,
      market: MarketSummary,
      selection: SelectionSummary,
      competitor: Option[CompetitorSummary]) {

    def settled(settledAt: OffsetDateTime, outcome: BetOutcome, fixtureStatus: FixtureLifecycleStatus): BetHistory = {
      val updatedDetails = bet.copy(settledAt = Some(settledAt), outcome = Some(outcome), status = BetStatus.Settled)
      val fixtureSummary = fixture.copy(status = fixtureStatus)
      copy(bet = updatedDetails, fixture = fixtureSummary)
    }

    def resettled(
        resettledAt: OffsetDateTime,
        outcome: BetOutcome,
        fixtureStatus: FixtureLifecycleStatus): BetHistory = {
      val updatedDetails =
        bet.copy(resettledAt = Some(resettledAt), outcome = Some(outcome), status = BetStatus.Resettled)
      val fixtureSummary = fixture.copy(status = fixtureStatus)
      copy(bet = updatedDetails, fixture = fixtureSummary)
    }

    def voided(voidedAt: OffsetDateTime, fixtureStatus: FixtureLifecycleStatus): BetHistory = {
      val updatedDetails = bet.copy(voidedAt = Some(voidedAt), status = BetStatus.Voided)
      val fixtureSummary = fixture.copy(status = fixtureStatus)
      copy(bet = updatedDetails, fixture = fixtureSummary)
    }

    def pushed(pushedAt: OffsetDateTime, fixtureStatus: FixtureLifecycleStatus): BetHistory = {
      val updatedDetails = bet.copy(pushedAt = Some(pushedAt), status = BetStatus.Pushed)
      val fixtureSummary = fixture.copy(status = fixtureStatus)
      copy(bet = updatedDetails, fixture = fixtureSummary)
    }

    def cancelled(cancelledAt: OffsetDateTime, fixtureStatus: FixtureLifecycleStatus): BetHistory = {
      val updatedDetails = bet.copy(cancelledAt = Some(cancelledAt), status = BetStatus.Cancelled)
      val fixtureSummary = fixture.copy(status = fixtureStatus)
      copy(bet = updatedDetails, fixture = fixtureSummary)
    }
  }

  final case class BetSummary(
      id: BetId,
      stake: Stake,
      odds: Odds,
      placedAt: OffsetDateTime,
      settledAt: Option[OffsetDateTime],
      resettledAt: Option[OffsetDateTime],
      voidedAt: Option[OffsetDateTime],
      pushedAt: Option[OffsetDateTime],
      cancelledAt: Option[OffsetDateTime],
      outcome: Option[BetOutcome],
      status: BetStatus)

  final case class BetHistoryQuery(
      placedWithin: Option[TimeRange] = None,
      statuses: Set[BetStatus],
      outcome: Option[BetOutcome] = None,
      pagination: Pagination)

  final case class Leg(
      id: BetId,
      sport: SportSummary,
      tournament: TournamentSummary,
      fixture: FixtureSummary,
      market: MarketSummary,
      selection: SelectionSummary,
      competitor: Option[CompetitorSummary],
      @JsonKey("displayOdds") odds: Odds,
      settledAt: Option[OffsetDateTime],
      outcome: Option[BetOutcome],
      status: BetStatus)

  final case class BetView(
      betId: BetId,
      betType: BetType,
      stake: Stake,
      outcome: Option[BetOutcome],
      placedAt: OffsetDateTime,
      settledAt: Option[OffsetDateTime],
      voidedAt: Option[OffsetDateTime],
      cancelledAt: Option[OffsetDateTime],
      @JsonKey("displayOdds") odds: Odds,
      sports: List[SportSummary],
      profitLoss: Option[BigDecimal],
      legs: List[Leg])

  object BetView {

    def fromBetHistory(betHistory: BetHistory): BetView = {
      val bet = betHistory.bet
      val legs = List(
        Leg(
          id = betHistory.bet.id,
          sport = betHistory.sport,
          tournament = betHistory.tournament,
          fixture = betHistory.fixture,
          market = betHistory.market,
          selection = betHistory.selection,
          competitor = betHistory.competitor,
          odds = bet.odds,
          settledAt = bet.settledAt,
          outcome = bet.outcome,
          status = bet.status))
      val profitLossValue = bet.outcome match {
        case Some(outcome) if Seq(BetStatus.Settled, BetStatus.Resettled).contains(bet.status) =>
          Some(outcome match {
            case Lost => bet.stake.value.amount
            case Won  => bet.stake.value.amount * (bet.odds.value - 1)
          })
        case _ => None
      }

      BetView(
        betId = bet.id,
        betType = BetType.Single,
        stake = bet.stake,
        outcome = bet.outcome,
        placedAt = bet.placedAt,
        settledAt = bet.settledAt,
        cancelledAt = bet.cancelledAt,
        voidedAt = bet.voidedAt,
        odds = bet.odds,
        sports = List(betHistory.sport),
        profitLoss = profitLossValue,
        legs = legs)
    }
  }

  sealed trait BetType extends EnumEntry with UpperSnakecase

  object BetType extends Enum[BetType] {
    def values: IndexedSeq[BetType] = findValues

    final case object Single extends BetType
    final case object Multi extends BetType
  }

  sealed trait BetStatus extends EnumEntry with UpperSnakecase

  object BetStatus extends Enum[BetStatus] {
    def values: IndexedSeq[BetStatus] = findValues

    final case object Open extends BetStatus
    final case object Settled extends BetStatus
    final case object Resettled extends BetStatus
    final case object Voided extends BetStatus
    final case object Pushed extends BetStatus
    final case object Cancelled extends BetStatus
  }

  sealed trait BetOutcome extends EnumEntry with UpperSnakecase

  object BetOutcome extends Enum[BetOutcome] {
    override def values: IndexedSeq[BetOutcome] = findValues

    final case object Won extends BetOutcome
    final case object Lost extends BetOutcome
  }

  // Errors
  sealed trait BetDetailsError
  sealed trait BetSettlementError
  sealed trait BetResettlementError
  sealed trait BetVoidingError
  sealed trait BetPushingError
  sealed trait BetCancellationError

  final case class UnexpectedStateError(betId: BetId, state: BetState.Status)
      extends BetDetailsError
      with BetSettlementError
      with BetResettlementError
      with BetVoidingError
      with BetPushingError
      with BetCancellationError

  final case class UnexpectedBetErrorException(underlying: Throwable)
      extends RuntimeException(s"Unexpected error [${underlying.getMessage}]")
}
