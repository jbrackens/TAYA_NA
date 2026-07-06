package phoenix.reports.unit
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext

import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import cats.data.EitherT
import org.scalamock.scalatest.MockFactory
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.application.es.WalletPendingWithdrawalsReportingEventHandler
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateOdds
import phoenix.support.DataGenerator.generateRealMoney
import phoenix.support.DataGenerator.generateReservationId
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.WalletActorProtocol.events._
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.support.WalletsDataGenerator.generateWalletId

// TODO (PHXD-3293): remove after release of PHXD-3293
final class WalletPendingWithdrawalsReportingEventHandlerSpec()(implicit mat: Materializer)
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with MockFactory {

  private val clock: Clock = Clock.utcClock
  implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  val today = clock.currentOffsetDateTime()
  val reportingDay = ReportingPeriod.enclosingDay(today, clock)

  "A WalletPendingWithdrawalsReportingEventHandler" should {
    "handle PaymentTransaction event with a PaymentTransaction" in {
      val event = FundsReservedForWithdrawal(
        walletId = generateWalletId(),
        withdrawal = WithdrawalReservation(
          generateReservationId(),
          PositiveAmount.ensure(RealMoney(21.37)).unsafe(),
          CreditCardPaymentMethod),
        previousBalance = AccountBalance(
          available = MoneyAmount(100),
          blocked = BlockedFunds(blockedForBets = MoneyAmount.zero.get, blockedForWithdrawals = MoneyAmount.zero.get)),
        createdAt = clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletSummaryRepository]
      (walletsRepository
        .recordWalletTransaction(_: PunterId, _: Transaction)(_: ExecutionContext))
        .expects(event.walletId.owner, event.transaction, *)
        .returns(EitherT.safeRightT(()))
        .once()

      await(WalletPendingWithdrawalsReportingEventHandler.handle(walletsRepository, event))
      await(
        walletsRepository
          .getDailyWalletSummary(reportingDay)
          .runWith(Sink.head)).withdrawals.pending shouldBe MoneyAmount(21.37)
    }

    "ignore other event" in {
      val event = FundsReservedForBet(
        walletId = generateWalletId(),
        reservationId = generateReservationId(),
        bet = Bet(betId = generateBetId(), stake = generateRealMoney(), odds = generateOdds()),
        previousBalance = AccountBalance(
          available = MoneyAmount(100),
          blocked = BlockedFunds(blockedForBets = MoneyAmount.zero.get, blockedForWithdrawals = MoneyAmount.zero.get)),
        createdAt = clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletSummaryRepository]
      (walletsRepository
        .recordWalletTransaction(_: PunterId, _: Transaction)(_: ExecutionContext))
        .expects(event.walletId.owner, event.transaction, *)
        .returns(EitherT.safeRightT(()))
        .once()

      await(WalletPendingWithdrawalsReportingEventHandler.handle(walletsRepository, event))
      await(
        walletsRepository
          .getDailyWalletSummary(reportingDay)
          .runWith(Sink.head)).withdrawals.pending shouldBe MoneyAmount(0)
    }
  }
}
