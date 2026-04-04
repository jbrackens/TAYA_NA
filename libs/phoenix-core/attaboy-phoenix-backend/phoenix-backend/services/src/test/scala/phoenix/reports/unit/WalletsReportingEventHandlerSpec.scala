package phoenix.reports.unit

import java.time.OffsetDateTime
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext

import cats.data.EitherT
import org.scalamock.scalatest.MockFactory
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.application.es.WalletsReportingEventHandler
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateReservationId
import phoenix.support.FutureSupport
import phoenix.wallets.WalletActorProtocol.events.BetWon
import phoenix.wallets.WalletActorProtocol.events.WalletCreated
import phoenix.wallets.WalletsBoundedContextProtocol.AccountBalance
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.BlockedFunds
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.support.WalletsDataGenerator.generateWalletId

final class WalletsReportingEventHandlerSpec extends AnyWordSpec with Matchers with FutureSupport with MockFactory {
  implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  val clock: Clock = Clock.utcClock

  "A WalletsReportingEventHandler" should {
    "handle WalletCreated event" in {
      val event =
        WalletCreated(
          generateWalletId(),
          Balance(RealMoney(DefaultCurrencyMoney(21.37))),
          clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletSummaryRepository]
      (walletsRepository
        .createWallet(_: PunterId, _: Balance, _: OffsetDateTime)(_: ExecutionContext))
        .expects(event.walletId.owner, event.balance, event.createdAt, *)
        .returns(EitherT.safeRightT(()))
        .once()

      await(WalletsReportingEventHandler.handle(walletsRepository, event))
    }

    "handle TransactionEvent" in {
      val event = BetWon(
        walletId = generateWalletId(),
        reservationId = generateReservationId(),
        bet = Bet(generateBetId(), RealMoney(25), Odds(2.0)),
        previousBalance = AccountBalance(
          available = MoneyAmount(100),
          blocked = BlockedFunds(blockedForBets = MoneyAmount(25), blockedForWithdrawals = MoneyAmount.zero.get)),
        createdAt = clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletSummaryRepository]
      (walletsRepository
        .recordWalletTransaction(_: PunterId, _: Transaction)(_: ExecutionContext))
        .expects(event.walletId.owner, event.transaction, *)
        .returns(EitherT.safeRightT(()))
        .once()

      await(WalletsReportingEventHandler.handle(walletsRepository, event))
    }
  }
}
