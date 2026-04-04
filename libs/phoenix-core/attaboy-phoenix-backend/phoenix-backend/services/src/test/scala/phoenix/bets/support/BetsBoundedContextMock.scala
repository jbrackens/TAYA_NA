package phoenix.bets.support

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.NonEmptyList

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetState
import phoenix.bets.BetValidator
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetCancellationError
import phoenix.bets.BetsBoundedContext.BetDetails
import phoenix.bets.BetsBoundedContext.BetDetailsError
import phoenix.bets.BetsBoundedContext.BetHistoryQuery
import phoenix.bets.BetsBoundedContext.BetPushingError
import phoenix.bets.BetsBoundedContext.BetSettlementError
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetType
import phoenix.bets.BetsBoundedContext.BetView
import phoenix.bets.BetsBoundedContext.BetVoidingError
import phoenix.bets.BetsBoundedContext.UnexpectedBetErrorException
import phoenix.bets.BetsBoundedContext.UnexpectedStateError
import phoenix.bets.CancellationReason
import phoenix.bets.Stake
import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.odds.Odds
import phoenix.core.pagination.PaginatedResult
import phoenix.http.core.Geolocation
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.support.DataGenerator.clock
import phoenix.support.DataGenerator.generateBetId
import phoenix.wallets.WalletsBoundedContextProtocol

object BetsBoundedContextMock {

  class BetsSuccessMock(lookupStatus: BetState.Status, lookupBetData: BetData) extends BetsBoundedContext {
    override def openBet(
        id: BetId,
        betData: BetData,
        geolocation: Geolocation,
        reservationId: WalletsBoundedContextProtocol.ReservationId,
        placedAt: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] =
      EitherT.safeRightT(())

    override def failBet(id: BetId, betData: BetData, reasons: NonEmptyList[BetValidator.BetValidationError])(implicit
        ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] = EitherT.safeRightT(())

    override def betDetails(id: BetId)(implicit ec: ExecutionContext): EitherT[Future, BetDetailsError, BetDetails] =
      EitherT.safeRightT(
        BetDetails(
          id,
          lookupStatus,
          lookupBetData.punterId,
          lookupBetData.marketId,
          lookupBetData.selectionId,
          lookupBetData.stake,
          lookupBetData.odds,
          false,
          List.empty))

    override def settleBets(marketId: MarketId, winningSelectionId: SelectionId)(implicit
        ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
      EitherT.safeRightT(())

    override def resettleBets(marketId: MarketId, newWinningSelectionId: SelectionId, resettledAt: OffsetDateTime)(
        implicit ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
      EitherT.safeRightT(())

    override def voidBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetVoidingError, Unit] =
      EitherT.safeRightT(())

    override def pushBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetPushingError, Unit] =
      EitherT.safeRightT(())

    override def cancelBet(
        betId: BetId,
        adminUser: AdminId,
        cancellationReason: CancellationReason,
        betCancellationTimestamp: OffsetDateTime)(implicit
        ec: ExecutionContext): EitherT[Future, BetCancellationError, Unit] = EitherT.safeRightT(())

    override def searchForBets(punterId: PunterId, query: BetHistoryQuery)(implicit
        ec: ExecutionContext): Future[PaginatedResult[BetView]] =
      Future.successful(PaginatedResult(data = Nil, totalCount = 0, query.pagination))

    override def cancelUnsettledBets(punterId: PunterId, cancellationReason: CancellationReason)(implicit
        ec: ExecutionContext,
        clock: Clock): EitherT[Future, BetCancellationError, Unit] = EitherT.safeRightT(())
  }

  def betsSuccessMock(lookupStatus: BetState.Status, lookupBetData: BetData): BetsBoundedContext =
    new BetsSuccessMock(lookupStatus, lookupBetData)

  def betsSearchMock(betsSearchResult: PaginatedResult[BetView]): BetsBoundedContext =
    new BetsBoundedContext {
      override def openBet(
          betId: BetId,
          betData: BetData,
          geolocation: Geolocation,
          reservationId: WalletsBoundedContextProtocol.ReservationId,
          placedAt: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] =
        EitherT.leftT(UnexpectedStateError(betId, BetState.Status.Uninitialized))

      override def failBet(betId: BetId, betData: BetData, reasons: NonEmptyList[BetValidator.BetValidationError])(
          implicit ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] =
        EitherT.leftT(UnexpectedStateError(betId, BetState.Status.Uninitialized))

      override def betDetails(betId: BetId)(implicit
          ec: ExecutionContext): EitherT[Future, BetDetailsError, BetDetails] =
        EitherT.leftT(UnexpectedStateError(betId, BetState.Status.Voided))

      override def settleBets(marketId: MarketId, winningSelectionId: SelectionId)(implicit
          ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Voided))

      override def resettleBets(marketId: MarketId, newWinningSelectionId: SelectionId, resettledAt: OffsetDateTime)(
          implicit ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Voided))

      override def voidBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetVoidingError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Voided))

      override def pushBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetPushingError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Voided))

      override def cancelBet(
          betId: BetId,
          adminUser: AdminId,
          cancellationReason: CancellationReason,
          betCancellationTimestamp: OffsetDateTime)(implicit
          ec: ExecutionContext): EitherT[Future, BetCancellationError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Cancelled))

      override def searchForBets(punterId: PunterId, query: BetHistoryQuery)(implicit
          ec: ExecutionContext): Future[PaginatedResult[BetView]] =
        Future.successful(betsSearchResult)

      override def cancelUnsettledBets(punterId: PunterId, cancellationReason: CancellationReason)(implicit
          ec: ExecutionContext,
          clock: Clock): EitherT[Future, BetCancellationError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Cancelled))
    }

  def betsWithDomainFailureMock: BetsBoundedContext =
    new BetsBoundedContext {

      override def openBet(
          id: BetId,
          betData: BetData,
          geolocation: Geolocation,
          reservationId: WalletsBoundedContextProtocol.ReservationId,
          placedAt: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] =
        EitherT.leftT(UnexpectedStateError(id, BetState.Status.Uninitialized))

      override def failBet(id: BetId, betData: BetData, reasons: NonEmptyList[BetValidator.BetValidationError])(implicit
          ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] =
        EitherT.leftT(UnexpectedStateError(id, BetState.Status.Uninitialized))

      override def betDetails(betId: BetId)(implicit
          ec: ExecutionContext): EitherT[Future, BetDetailsError, BetDetails] =
        EitherT.leftT(UnexpectedStateError(betId, BetState.Status.Voided))

      override def settleBets(marketId: MarketId, winningSelectionId: SelectionId)(implicit
          ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Voided))

      override def resettleBets(marketId: MarketId, newWinningSelectionId: SelectionId, resettledAt: OffsetDateTime)(
          implicit ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Voided))

      override def voidBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetVoidingError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Voided))

      override def pushBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetPushingError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Pushed))

      override def cancelBet(
          betId: BetId,
          adminUser: AdminId,
          cancellationReason: CancellationReason,
          betCancellationTimestamp: OffsetDateTime)(implicit
          ec: ExecutionContext): EitherT[Future, BetCancellationError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Cancelled))

      override def searchForBets(punterId: PunterId, query: BetHistoryQuery)(implicit
          ec: ExecutionContext): Future[PaginatedResult[BetView]] =
        Future.failed(UnexpectedBetErrorException(new RuntimeException("Boom!!")))

      override def cancelUnsettledBets(punterId: PunterId, cancellationReason: CancellationReason)(implicit
          ec: ExecutionContext,
          clock: Clock): EitherT[Future, BetCancellationError, Unit] =
        EitherT.leftT(UnexpectedStateError(generateBetId(), BetState.Status.Cancelled))
    }
}

final class MemorizedBetsBoundedContext(
    var bets: List[(BetId, AdminId, BetStatus, OffsetDateTime, Option[CancellationReason])] = List.empty)
    extends BetsBoundedContext {
  override def openBet(
      id: BetId,
      betData: BetData,
      geolocation: Geolocation,
      reservationId: WalletsBoundedContextProtocol.ReservationId,
      placedAt: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] =
    EitherT.safeRightT(())

  override def failBet(id: BetId, betData: BetData, reasons: NonEmptyList[BetValidator.BetValidationError])(implicit
      ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] = EitherT.safeRightT(())

  override def betDetails(id: BetId)(implicit ec: ExecutionContext): EitherT[Future, BetDetailsError, BetDetails] =
    EitherT.leftT(UnexpectedStateError(id, BetState.Status.Voided))

  override def settleBets(marketId: MarketId, winningSelectionId: SelectionId)(implicit
      ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
    EitherT.safeRightT(())

  override def resettleBets(marketId: MarketId, newWinningSelectionId: SelectionId, resettledAt: OffsetDateTime)(
      implicit ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
    EitherT.safeRightT(())

  override def voidBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetVoidingError, Unit] =
    EitherT.safeRightT(())

  override def pushBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetPushingError, Unit] =
    EitherT.safeRightT(())

  override def cancelBet(
      betId: BetId,
      adminUser: AdminId,
      cancellationReason: CancellationReason,
      betCancellationTimestamp: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, BetCancellationError, Unit] =
    EitherT.safeRightT {
      bets = bets.filterNot(_._1 == betId) :+ (
          (
            betId,
            adminUser,
            BetStatus.Cancelled,
            betCancellationTimestamp,
            Some(cancellationReason)))
    }

  override def searchForBets(punterId: PunterId, query: BetHistoryQuery)(implicit
      ec: ExecutionContext): Future[PaginatedResult[BetView]] =
    Future.successful(
      PaginatedResult(
        data = bets
          .filter(_._2 == AdminId.fromPunterId(punterId))
          .filter(b => query.statuses.contains(b._3))
          .map(
            b =>
              BetView(
                b._1,
                BetType.Single,
                Stake.unsafe(DefaultCurrencyMoney(BigDecimal(1))),
                None,
                clock.currentOffsetDateTime(),
                None,
                None,
                None,
                Odds(2),
                List(),
                None,
                List())),
        totalCount = 0,
        query.pagination))

  override def cancelUnsettledBets(punterId: PunterId, cancellationReason: CancellationReason)(implicit
      ec: ExecutionContext,
      clock: Clock): EitherT[Future, BetCancellationError, Unit] =
    EitherT.safeRightT {
      val adminId = AdminId.fromPunterId(punterId)
      bets =
        bets.filterNot(_._2 == adminId) ++
        bets.filter(_._2 == adminId).map(b => b.copy(_3 = BetStatus.Cancelled, _5 = Some(cancellationReason)))
    }
}
