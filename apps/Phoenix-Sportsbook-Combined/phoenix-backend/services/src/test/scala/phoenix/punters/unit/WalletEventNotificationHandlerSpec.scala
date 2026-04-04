package phoenix.punters.unit
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.EitherTUtils._
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailSubject
import phoenix.core.emailing.EmailingModule
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.punters.CustomerSupportContext
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.TalonAppBaseUrl
import phoenix.punters.application.es.WalletEventNotificationHandler
import phoenix.punters.domain.Email
import phoenix.punters.domain.UserProfile
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForWithdrawal
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletActorProtocol.events.WithdrawalCancelled
import phoenix.wallets.WalletActorProtocol.events.WithdrawalConfirmed
import phoenix.wallets.WalletsBoundedContextProtocol.AccountBalance
import phoenix.wallets.WalletsBoundedContextProtocol.BlockedFunds
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod

final class WalletEventNotificationHandlerSpec
    extends AnyWordSpecLike
    with BeforeAndAfterAll
    with FutureSupport
    with Matchers {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())

  private val clock = new FakeHardcodedClock()

  "WalletEventNotificationHandler" should {

    "send punter notification when cash withdrawal created" in new WalletEventHandlerScope(
      customerAppBaseUrl = PhoenixAppBaseUrl("https://Vie.gg/app")) {
      // given
      val cashWithdrawalIdentifier: CashWithdrawalIdentifier = CashWithdrawalIdentifier.create()
      val cashWithdrawalCreated: WalletEvent =
        FundsReservedForWithdrawal(
          walletId = WalletId.deriveFrom(punterId),
          withdrawal = WithdrawalReservation(
            cashWithdrawalIdentifier.asReservation,
            PositiveAmount.ensure(RealMoney(2137)).unsafe(),
            PaymentMethod.CashWithdrawalPaymentMethod),
          previousBalance = previousBalance,
          createdAt = clock.currentOffsetDateTime())

      // when
      await(handleEvent(cashWithdrawalCreated))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == EmailSubject("Cash Withdrawal Reservation Created") &&
        message.recipient == punterProfile.email &&
        message.content.value.contains("Your withdrawal request in the amount of $2137.00 has been processed.") &&
        message.content.value.contains(s"""unique phrase is "${cashWithdrawalIdentifier.identifier}"""")
        message.content.value.contains(s"""your online gaming account is on "Vie.gg"""")
      }
    }

    "send punter notification when cheque withdrawal created" in new WalletEventHandlerScope {
      // given
      val chequeWithdrawalCreated: WalletEvent =
        FundsReservedForWithdrawal(
          walletId = WalletId.deriveFrom(punterId),
          withdrawal = WithdrawalReservation(
            ReservationId.create(),
            PositiveAmount.ensure(RealMoney(2137)).unsafe(),
            PaymentMethod.ChequeWithdrawalPaymentMethod),
          previousBalance = previousBalance,
          createdAt = clock.currentOffsetDateTime())

      // when
      await(handleEvent(chequeWithdrawalCreated))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == EmailSubject("Cheque Withdrawal Initiated") &&
        message.recipient == punterProfile.email &&
        message.content.value.contains("You have requested a cheque withdrawal of $2137.00.")
      }
    }

    "send customer service notification when cheque withdrawal created" in new WalletEventHandlerScope(
      talonAppBaseUrl = TalonAppBaseUrl("https://talon.vie.gg")) {
      // given
      val reservationId: ReservationId = ReservationId.create()
      val chequeWithdrawalCreated: WalletEvent =
        FundsReservedForWithdrawal(
          walletId = WalletId.deriveFrom(punterId),
          withdrawal = WithdrawalReservation(
            reservationId,
            PositiveAmount.ensure(RealMoney(2137)).unsafe(),
            PaymentMethod.ChequeWithdrawalPaymentMethod),
          previousBalance = previousBalance,
          createdAt = clock.currentOffsetDateTime())

      // when
      await(handleEvent(chequeWithdrawalCreated))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == EmailSubject("Cheque Withdrawal Initiated") &&
        message.recipient == customerSupportEmail &&
        message.content.value.contains("We've noticed a cheque withdrawal attempt of $2137.00") &&
        message.content.value.contains(s"https://talon.vie.gg/users/${punterId.value}?activityDetails=walletHistory") &&
        message.content.value.contains(reservationId.unwrap)
      }
    }

    "send customer notification when cheque withdrawal accepted" in new WalletEventHandlerScope {
      // given
      val reservationId: ReservationId = ReservationId.create()
      val chequeWithdrawalConfirmed: WalletEvent =
        WithdrawalConfirmed(
          walletId = WalletId.deriveFrom(punterId),
          withdrawal = WithdrawalReservation(
            reservationId,
            PositiveAmount.ensure(RealMoney(2137)).unsafe(),
            PaymentMethod.ChequeWithdrawalPaymentMethod),
          confirmedBy = ConfirmationOrigin.BackofficeWorker(adminId = AdminId("admin-123")),
          previousBalance = previousBalance,
          createdAt = clock.currentOffsetDateTime())

      // when
      await(handleEvent(chequeWithdrawalConfirmed))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == EmailSubject("Cheque Withdrawal Accepted") &&
        message.recipient == punterProfile.email &&
        message.content.value.contains("Your cheque withdrawal request of $2137.00 has been accepted.")
      }
    }

    "send customer notification when cheque withdrawal rejected" in new WalletEventHandlerScope {
      // given
      val reservationId: ReservationId = ReservationId.create()
      val chequeWithdrawalRejected: WalletEvent =
        WithdrawalCancelled(
          walletId = WalletId.deriveFrom(punterId),
          withdrawal = WithdrawalReservation(
            reservationId,
            PositiveAmount.ensure(RealMoney(2137)).unsafe(),
            PaymentMethod.ChequeWithdrawalPaymentMethod),
          rejectedBy = RejectionOrigin.BackofficeWorker(adminId = AdminId("admin-123"), reason = "possible fraud"),
          previousBalance = previousBalance,
          createdAt = clock.currentOffsetDateTime())

      // when
      await(handleEvent(chequeWithdrawalRejected))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == EmailSubject("Cheque Withdrawal Rejected") &&
        message.recipient == punterProfile.email &&
        message.content.value.contains("Your cheque withdrawal request of $2137.00 has been rejected.")
      }
    }
  }

  private lazy val previousBalance: AccountBalance = AccountBalance(
    available = MoneyAmount(2137),
    blocked = BlockedFunds(blockedForBets = MoneyAmount(0), blockedForWithdrawals = MoneyAmount(0)))
}

private abstract class WalletEventHandlerScope(
    val punterProfile: UserProfile = PunterDataGenerator.generateUserProfile(),
    val customerAppBaseUrl: PhoenixAppBaseUrl = PhoenixAppBaseUrl("https://Vie.gg"),
    val talonAppBaseUrl: TalonAppBaseUrl = TalonAppBaseUrl("http://localhost/talon"),
    val customerSupportEmail: Email = Email.fromString("customer.support@vie.gg").unsafe())(implicit
    ec: ExecutionContext) {
  val emailSender: EmailSenderStub = new EmailSenderStub()
  val punterId: PunterId = PunterId(punterProfile.userId.value.toString)

  def handleEvent(event: WalletEvent): Future[Unit] = {
    WalletEventNotificationHandler.handle(
      punterReader = _ => EitherT.safeRightT(punterProfile),
      mailer = EmailingModule.init(emailSender).mailer,
      phoenixUrl = customerAppBaseUrl,
      customerSupport = CustomerSupportContext(talonAppBaseUrl, customerSupportEmail))(event)
  }
}
