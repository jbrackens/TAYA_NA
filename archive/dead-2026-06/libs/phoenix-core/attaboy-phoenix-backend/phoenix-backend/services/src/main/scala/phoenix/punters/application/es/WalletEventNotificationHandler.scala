package phoenix.punters.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.emailing.EmailMessageTemplate
import phoenix.core.emailing.Mailer
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.CustomerSupportContext
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.es.Notifications.PunterReader
import phoenix.punters.domain.CustomerServiceNotifications
import phoenix.punters.domain.EmailNotification.CashWithdrawalReservationCreated
import phoenix.punters.domain.EmailNotification.CashWithdrawalReservationCreated.CashWithdrawalReservationCreatedParams
import phoenix.punters.domain.EmailNotification.ChequeWithdrawalAccepted
import phoenix.punters.domain.EmailNotification.ChequeWithdrawalInitiated
import phoenix.punters.domain.EmailNotification.ChequeWithdrawalPunterNotificationParams
import phoenix.punters.domain.EmailNotification.ChequeWithdrawalRejected
import phoenix.punters.domain.UserProfile
import phoenix.wallets.WalletActorProtocol.events.AdjustingFundsDeposited
import phoenix.wallets.WalletActorProtocol.events.AdjustingFundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.BetCancelled
import phoenix.wallets.WalletActorProtocol.events.BetLost
import phoenix.wallets.WalletActorProtocol.events.BetPushed
import phoenix.wallets.WalletActorProtocol.events.BetResettled
import phoenix.wallets.WalletActorProtocol.events.BetVoided
import phoenix.wallets.WalletActorProtocol.events.BetWon
import phoenix.wallets.WalletActorProtocol.events.FundsDeposited
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForBet
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForWithdrawal
import phoenix.wallets.WalletActorProtocol.events.FundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.NegativeBalance
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendApproved
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendRejected
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAcceptanceRequested
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAccepted
import phoenix.wallets.WalletActorProtocol.events.WalletCreated
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletActorProtocol.events.WithdrawalCancelled
import phoenix.wallets.WalletActorProtocol.events.WithdrawalConfirmed
import phoenix.wallets.domain.PaymentMethod

final class WalletEventNotificationHandler(
    punterReader: PunterReader,
    mailer: Mailer,
    phoenixUrl: PhoenixAppBaseUrl,
    customerSupport: CustomerSupportContext)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {

  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] =
    WalletEventNotificationHandler
      .handle(punterReader, mailer, phoenixUrl, customerSupport)(envelope.event)
      .map(_ => Done)
}

private[punters] object WalletEventNotificationHandler {

  private val log: Logger = LoggerFactory.getLogger(this.objectName)

  def handle(
      punterReader: PunterReader,
      mailer: Mailer,
      phoenixUrl: PhoenixAppBaseUrl,
      customerSupport: CustomerSupportContext)(event: WalletEvent)(implicit ec: ExecutionContext): Future[Unit] = {

    event match {
      case event: FundsReservedForWithdrawal
          if event.withdrawal.paymentMethod == PaymentMethod.CashWithdrawalPaymentMethod =>
        for {
          punter <- readPunterEmail(punterReader, punterId = event.walletId.owner)
          _ <- mailer.send(cashWithdrawalCreatedEmail(punter, phoenixUrl, event))
        } yield ()

      case event: FundsReservedForWithdrawal
          if event.withdrawal.paymentMethod == PaymentMethod.ChequeWithdrawalPaymentMethod =>
        for {
          punter <- readPunterEmail(punterReader, punterId = event.walletId.owner)
          _ <- mailer.send(chequeWithdrawalCreatedPunterEmail(punter, event))
          _ <- mailer.send(chequeWithdrawalCreatedCustomerSupportEmail(punter, customerSupport, event))
        } yield ()

      case event: WithdrawalConfirmed
          if event.withdrawal.paymentMethod == PaymentMethod.ChequeWithdrawalPaymentMethod =>
        for {
          punter <- readPunterEmail(punterReader, punterId = event.walletId.owner)
          _ <- mailer.send(chequeWithdrawalAcceptedPunterEmail(punter, event))
        } yield ()

      case event: WithdrawalCancelled
          if event.withdrawal.paymentMethod == PaymentMethod.ChequeWithdrawalPaymentMethod =>
        for {
          punter <- readPunterEmail(punterReader, punterId = event.walletId.owner)
          _ <- mailer.send(chequeWithdrawalRejectedPunterEmail(punter, event))
        } yield ()

      case _: FundsReservedForWithdrawal | _: AdjustingFundsDeposited | _: AdjustingFundsWithdrawn |
          _: WithdrawalConfirmed | _: FundsDeposited | _: WalletCreated | _: FundsWithdrawn |
          _: ResponsibilityCheckAcceptanceRequested | _: ResponsibilityCheckAccepted | _: WithdrawalCancelled |
          _: BetCancelled | _: BetLost | _: BetPushed | _: BetResettled | _: BetVoided | _: BetWon |
          _: FundsReservedForBet | _: PunterUnsuspendApproved | _: PunterUnsuspendRejected | _: NegativeBalance =>
        Future.unit
    }
  }

  private def readPunterEmail(reader: PunterReader, punterId: PunterId)(implicit
      ec: ExecutionContext): Future[UserProfile] =
    reader(punterId).leftMap { error =>
      log.error(s"Could not retrieve Punter profile {} - Error: ${error.toString}", kv("PunterId", punterId.value))
      new MissingPunterDetails(punterId, error.toString)
    }.rethrowT

  private def cashWithdrawalCreatedEmail(
      punter: UserProfile,
      phoenixAppUrl: PhoenixAppBaseUrl,
      event: FundsReservedForWithdrawal): EmailMessageTemplate = {
    val amount = DefaultCurrencyMoney(event.transaction.amount)
    val transactionId = event.transaction.transactionId

    CashWithdrawalReservationCreated.build(
      punter.email,
      CashWithdrawalReservationCreatedParams(punter.name, phoenixAppUrl, amount, transactionId))
  }

  private def chequeWithdrawalCreatedPunterEmail(
      punter: UserProfile,
      event: FundsReservedForWithdrawal): EmailMessageTemplate =
    ChequeWithdrawalInitiated.build(punter.email, ChequeWithdrawalPunterNotificationParams(event.transaction.amount))

  private def chequeWithdrawalCreatedCustomerSupportEmail(
      punter: UserProfile,
      customerSupport: CustomerSupportContext,
      event: FundsReservedForWithdrawal): EmailMessageTemplate =
    CustomerServiceNotifications.ChequeWithdrawalInitiated.build(
      recipient = customerSupport.customerSupportEmail,
      templateParams = CustomerServiceNotifications.ChequeWithdrawalInitiated.Params(
        amount = DefaultCurrencyMoney(event.transaction.amount),
        name = punter.name,
        reservationId = event.withdrawal.reservationId,
        punterBackofficeUrl = customerSupport.talonPunterUrlFor(event.walletId.owner)))

  private def chequeWithdrawalAcceptedPunterEmail(
      punter: UserProfile,
      event: WithdrawalConfirmed): EmailMessageTemplate =
    ChequeWithdrawalAccepted.build(punter.email, ChequeWithdrawalPunterNotificationParams(event.transaction.amount))

  private def chequeWithdrawalRejectedPunterEmail(
      punter: UserProfile,
      event: WithdrawalCancelled): EmailMessageTemplate =
    ChequeWithdrawalRejected.build(punter.email, ChequeWithdrawalPunterNotificationParams(event.transaction.amount))

  private final class MissingPunterDetails(id: PunterId, error: String)
      extends RuntimeException(s"No such punter with PunterId: ${id.value} (Error: $error)")
}
