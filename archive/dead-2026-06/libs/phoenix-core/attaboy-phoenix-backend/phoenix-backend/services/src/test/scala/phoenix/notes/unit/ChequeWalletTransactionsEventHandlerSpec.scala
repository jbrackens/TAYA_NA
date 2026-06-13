package phoenix.notes.unit

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.notes.application.InsertNotes
import phoenix.notes.application.es.ChequeWalletTransactionsEventHandler
import phoenix.notes.domain.Note.ManualNote
import phoenix.notes.domain.Note.SystemNote
import phoenix.notes.support.InMemoryNoteRepository
import phoenix.notes.unit.ChequeWalletTransactionsEventHandlerSpec.EventHandlerScope
import phoenix.notes.unit.ChequeWalletTransactionsEventHandlerSpec.clock
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.support.DataGenerator.generateReservationId
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForWithdrawal
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletActorProtocol.events.WithdrawalCancelled
import phoenix.wallets.WalletActorProtocol.events.WithdrawalConfirmed
import phoenix.wallets.WalletsBoundedContextProtocol.AccountBalance
import phoenix.wallets.WalletsBoundedContextProtocol.BlockedFunds
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod

final class ChequeWalletTransactionsEventHandlerSpec
    extends AnyWordSpecLike
    with BeforeAndAfterAll
    with FutureSupport
    with Matchers {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())

  "ChequeWalletTransactionsEventHandler" should {
    "should create system note on cheque withdrawal attempt" in new EventHandlerScope {
      // given
      val chequeWithdrawalCreated: WalletEvent =
        FundsReservedForWithdrawal(
          walletId = WalletId.deriveFrom(punterId),
          withdrawal = WithdrawalReservation(
            generateReservationId(),
            PositiveAmount.ensure(RealMoney(2137)).unsafe(),
            PaymentMethod.ChequeWithdrawalPaymentMethod),
          previousBalance = previousBalance,
          createdAt = clock.currentOffsetDateTime())

      // when
      await(handleEvent(chequeWithdrawalCreated))

      // then
      notesRepository shouldContainNote {
        case SystemNote(_, owner, _, text) =>
          owner == punterId &&
          text.value.contains("Cheque withdrawal initiated")

        case _ => false
      }
    }

    "should create manual note on cheque withdrawal confirmation" in new EventHandlerScope {
      // given
      val chequeWithdrawalAccepted: WalletEvent =
        WithdrawalConfirmed(
          walletId = WalletId.deriveFrom(punterId),
          withdrawal = WithdrawalReservation(
            generateReservationId(),
            PositiveAmount.ensure(RealMoney(2137)).unsafe(),
            PaymentMethod.ChequeWithdrawalPaymentMethod),
          confirmedBy = ConfirmationOrigin.BackofficeWorker(adminId = AdminId("admin-123")),
          previousBalance = previousBalance,
          createdAt = clock.currentOffsetDateTime())

      // when
      await(handleEvent(chequeWithdrawalAccepted))

      // then
      notesRepository shouldContainNote {
        case ManualNote(_, owner, _, text, authorId) =>
          owner == punterId &&
          text.value.contains("Cheque withdrawal accepted") &&
          authorId == AdminId("admin-123")

        case _ => false
      }
    }

    "should create manual note on cheque withdrawal rejection" in new EventHandlerScope {
      // given
      val chequeWithdrawalRejected: WalletEvent =
        WithdrawalCancelled(
          walletId = WalletId.deriveFrom(punterId),
          withdrawal = WithdrawalReservation(
            generateReservationId(),
            PositiveAmount.ensure(RealMoney(2137)).unsafe(),
            PaymentMethod.ChequeWithdrawalPaymentMethod),
          rejectedBy = RejectionOrigin.BackofficeWorker(adminId = AdminId("admin-123"), reason = "possible fraud"),
          previousBalance = previousBalance,
          createdAt = clock.currentOffsetDateTime())

      // when
      await(handleEvent(chequeWithdrawalRejected))

      // then
      notesRepository shouldContainNote {
        case ManualNote(_, owner, _, text, authorId) =>
          owner == punterId &&
          text.value.contains("Cheque withdrawal rejected") &&
          text.value.contains("possible fraud") &&
          authorId == AdminId("admin-123")

        case _ => false
      }
    }
  }

  private lazy val previousBalance: AccountBalance = AccountBalance(
    available = MoneyAmount(2137),
    blocked = BlockedFunds(blockedForBets = MoneyAmount(0), blockedForWithdrawals = MoneyAmount(0)))
}

private object ChequeWalletTransactionsEventHandlerSpec {
  private val clock: Clock = Clock.utcClock

  abstract class EventHandlerScope(val punterId: PunterId = generatePunterId())(implicit ec: ExecutionContext) {
    val notesRepository: InMemoryNoteRepository = new InMemoryNoteRepository()
    private val insertNotes = new InsertNotes(notesRepository, clock, RandomUUIDGenerator)

    def handleEvent(event: WalletEvent): Future[Unit] =
      ChequeWalletTransactionsEventHandler.handle(insertNotes)(event)
  }
}
