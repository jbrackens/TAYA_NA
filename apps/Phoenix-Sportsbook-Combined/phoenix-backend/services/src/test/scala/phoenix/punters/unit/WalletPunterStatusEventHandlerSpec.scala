package phoenix.punters.unit

import java.time.OffsetDateTime
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.Assertion
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.BetEntity.BetId
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.EitherTUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.notes.application.InsertNotes
import phoenix.notes.domain.Note.SystemNote
import phoenix.notes.support.InMemoryNoteRepository
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.UnsuspendPunterError
import phoenix.punters.application.es.WalletPunterStatusEventHandler
import phoenix.punters.domain.SuspensionEntity
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletActorProtocol.events.BetResettled
import phoenix.wallets.WalletActorProtocol.events.NegativeBalance
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendApproved
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendRejected
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.Funds
import phoenix.wallets.support.WalletsDataGenerator

final class WalletPunterStatusEventHandlerSpec extends AnyWordSpec with Matchers with FutureSupport {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())

  "A WalletPunterStatusEventHandler" should {

    "unsuspend a punter on a PunterUnsuspendApproved event" in new StatusEventHandlerScope {
      val walletId = WalletsDataGenerator.generateWalletId()
      val event = PunterUnsuspendApproved(walletId)
      WalletPunterStatusEventHandler.handle(event, puntersBC, walletsBC, insertNotes, clock).futureValue

      unsuspended shouldBe List(walletId.owner)
    }

    "do nothing on an PunterUnsuspendRejected event" in new StatusEventHandlerScope {
      val walletId = WalletsDataGenerator.generateWalletId()
      val event = PunterUnsuspendRejected(walletId)

      WalletPunterStatusEventHandler.handle(event, puntersBC, walletsBC, insertNotes, clock).futureValue

      unsuspended shouldBe empty
    }

    "request a balance check on a BetResettled event" in new StatusEventHandlerScope {
      val walletId = WalletsDataGenerator.generateWalletId()
      val betId = BetId(RandomUUIDGenerator.generate().toString)
      val transactionId = RandomUUIDGenerator.generate().toString
      val bet = Bet(betId, Funds.RealMoney(DefaultCurrencyMoney(110)), Odds(1.1))
      val accountBalance = AccountBalance(
        available = MoneyAmount(10),
        blocked = BlockedFunds(blockedForBets = MoneyAmount(20), blockedForWithdrawals = MoneyAmount(0)))

      val event =
        BetResettled(walletId, transactionId, bet, winner = false, accountBalance, clock.currentOffsetDateTime())

      WalletPunterStatusEventHandler.handle(event, puntersBC, walletsBC, insertNotes, clock).futureValue

      checkRequested shouldBe List(walletId)
    }

    "set a Negative Balance state on a NegativeBalance event" in new StatusEventHandlerScope {
      val walletId = WalletsDataGenerator.generateWalletId()
      val event = NegativeBalance(walletId)

      WalletPunterStatusEventHandler.handle(event, puntersBC, walletsBC, insertNotes, clock).futureValue

      negativeBalances shouldBe List(walletId.owner)
      assertNote(walletId, notesRepository)
    }
  }

  private def assertNote(walletId: WalletId, notesRepository: InMemoryNoteRepository): Assertion = {
    notesRepository shouldContainNote {
      case SystemNote(_, owner, _, text) =>
        owner == walletId.owner && text.value.contains("Suspended due to negative balance")
      case _ => false
    }
  }
}

private abstract class StatusEventHandlerScope() {
  implicit val clock = new FakeHardcodedClock()
  val notesRepository: InMemoryNoteRepository = new InMemoryNoteRepository()
  val insertNotes = new InsertNotes(notesRepository, clock, RandomUUIDGenerator)
  var suspended = List.empty[PunterId]
  var unsuspended = List.empty[PunterId]
  var negativeBalances = List.empty[PunterId]
  var checkRequested = List.empty[WalletId]

  val puntersBC = new PuntersContextProviderSuccess() {

    override def setNegativeBalance(punterId: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
        ec: ExecutionContext): EitherT[Future, PuntersBoundedContext.SetNegativeBalanceError, Unit] = {
      negativeBalances = negativeBalances :+ punterId
      EitherT.safeRightT(())
    }

    override def unsetNegativeBalance(punterId: PunterId)(implicit
        ec: ExecutionContext): EitherT[Future, PuntersBoundedContext.UnsetNegativeBalanceError, Unit] = {
      EitherT.safeRightT(())
    }

    override def suspend(punterId: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
        ec: ExecutionContext): EitherT[Future, PuntersBoundedContext.SuspendPunterError, Unit] = {
      suspended = suspended :+ punterId
      EitherT.safeRightT(())
    }

    override def completeUnsuspend(punterId: PunterId)(implicit
        ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit] = {
      unsuspended = unsuspended :+ punterId
      EitherT.safeRightT(())
    }
  }

  val walletsBC = new WalletContextProviderSuccess(clock) {
    override def requestBalanceCheckForSuspend(walletId: WalletId)(implicit
        ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = {
      checkRequested = checkRequested :+ walletId
      EitherT.safeRightT(())
    }
  }
}
