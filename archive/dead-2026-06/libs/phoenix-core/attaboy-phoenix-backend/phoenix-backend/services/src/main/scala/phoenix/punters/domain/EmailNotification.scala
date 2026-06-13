package phoenix.punters.domain

import java.net.URL
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

import akka.http.scaladsl.model.Uri

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.formatForDisplay
import phoenix.core.emailing.EmailContentTemplate
import phoenix.core.emailing.EmailContentTemplate.NoParams
import phoenix.core.emailing.EmailContentTemplate.TemplateName
import phoenix.core.emailing.EmailContentTemplate.TemplatingParams
import phoenix.core.emailing.EmailMessageTemplate
import phoenix.core.emailing.EmailSubject
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.punters.PunterState
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionDuration.FiveYears
import phoenix.punters.PunterState.SelfExclusionDuration.OneYear
import phoenix.punters.TalonAppBaseUrl.TalonAppIndividualPunterUrl
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

sealed trait EmailNotification {
  type TP <: TemplatingParams
  def subject: EmailSubject
  def templateName: TemplateName

  def build(recipient: Email, templateParams: TP): EmailMessageTemplate =
    EmailMessageTemplate(recipient, subject, EmailContentTemplate(templateName, templateParams))
}

object EmailNotification {

  private val dateFormatter = DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss")

  private def formatDateTime(timestamp: OffsetDateTime): String = timestamp.format(dateFormatter)

  private def formatExclusionDuration(duration: SelfExclusionDuration): String =
    duration match {
      case OneYear   => "one year"
      case FiveYears => "five years"
    }

  final case class CoolOffPeriodParams(coolOffPeriod: PunterState.CoolOffPeriod) extends TemplatingParams {
    override def toMap: Map[String, String] = Map("coolOffEnd" -> formatDateTime(coolOffPeriod.endTime))
  }

  case object PunterSuspendedByOperator extends EmailNotification {
    final case class PunterSuspendedByOperatorParams(suspensionReason: String) extends TemplatingParams {
      override def toMap: Map[String, String] = Map("suspensionReason" -> suspensionReason)
    }

    override type TP = PunterSuspendedByOperatorParams
    override def subject: EmailSubject = EmailSubject("Account suspended")
    override def templateName: TemplateName = "punter_suspended_by_operator"
  }

  case object PunterSuspendedByNegativeBalance extends EmailNotification {
    override type TP = NoParams.type

    override def subject: EmailSubject = EmailSubject("Account suspended due to negative balance")
    override def templateName: TemplateName = "punter_suspended_by_negative_balance"
  }

  case object ExclusionBeganNotification extends EmailNotification {
    final case class ExclusionBeganParams(duration: SelfExclusionDuration) extends TemplatingParams {
      override def toMap: Map[String, Any] =
        Map("exclusionDuration" -> formatExclusionDuration(duration))
    }

    override type TP = ExclusionBeganParams
    override def subject: EmailSubject = EmailSubject("Exclusion period began")
    override def templateName: TemplateName = "punter_exclusion_began"
  }

  case object SelfInitiatedCoolOffPeriodBeganNotification extends EmailNotification {
    override type TP = CoolOffPeriodParams
    override def subject: EmailSubject = EmailSubject("Cool off period began")
    override def templateName: TemplateName = "punter_cool_off_began"
  }

  case object CoolOffPeriodEndedNotification extends EmailNotification {
    override type TP = NoParams.type
    override def subject: EmailSubject = EmailSubject("Cool off period ended")
    override def templateName: TemplateName = "punter_cool_off_ended"
  }

  case object AutomatedCoolOffPeriodBeganNotification extends EmailNotification {
    override type TP = CoolOffPeriodParams
    override def subject: EmailSubject = EmailSubject("Automated Cool off period began")
    override def templateName: TemplateName = "punter_automated_cool_off_began"
  }

  case object AutomatedCoolOffPeriodEndedNotification extends EmailNotification {
    override type TP = NoParams.type
    override def subject: EmailSubject = EmailSubject("Automated Cool off period ended")
    override def templateName: TemplateName = "punter_automated_cool_off_ended"
  }

  case object ExclusionEndedNotification extends EmailNotification {
    override type TP = NoParams.type
    override def subject: EmailSubject = EmailSubject("Exclusion period ended")
    override def templateName: TemplateName = "punter_exclusion_ended"
  }

  case object PunterSignedIn extends EmailNotification {
    final case class PunterSignedInParams(signInDate: OffsetDateTime) extends TemplatingParams {
      override def toMap: Map[String, String] = Map("signInDate" -> formatDateTime(signInDate))
    }

    override type TP = PunterSignedInParams
    override def subject: EmailSubject = EmailSubject("Sign in attempt")
    override def templateName: TemplateName = "punter_signed_in"
  }

  case object AccountActivation extends EmailNotification {
    final case class AccountActivationParams(activationURL: String) extends TemplatingParams {
      override def toMap: Map[String, String] = Map("activationURL" -> activationURL)
    }

    override type TP = AccountActivationParams
    override def subject: EmailSubject = EmailSubject("Account Activation")
    override def templateName: TemplateName = "account_activation"
  }

  case object ResetPassword extends EmailNotification {
    final case class ResetPasswordParams(resetPasswordURL: String, resetPasswordDate: OffsetDateTime)
        extends TemplatingParams {
      override def toMap: Map[String, String] =
        Map("resetPasswordURL" -> resetPasswordURL, "resetPasswordDate" -> formatDateTime(resetPasswordDate))
    }

    override type TP = ResetPasswordParams
    override def subject: EmailSubject = EmailSubject("Reset Password")
    override def templateName: TemplateName = "reset_password"
  }

  case object PasswordChanged extends EmailNotification {
    final case class PasswordChangedParams(passwordChangedDate: OffsetDateTime) extends TemplatingParams {
      override def toMap: Map[String, String] = Map("passwordChangedDate" -> formatDateTime(passwordChangedDate))
    }
    override type TP = PasswordChangedParams
    override def subject: EmailSubject = EmailSubject("Password Changed")
    override def templateName: TemplateName = "password_changed"
  }

  case object CashWithdrawalReservationCreated extends EmailNotification {
    final case class CashWithdrawalReservationCreatedParams(
        name: PersonalName,
        phoenixUrl: PhoenixAppBaseUrl,
        amount: DefaultCurrencyMoney,
        identifier: String)
        extends TemplatingParams {
      override def toMap: Map[String, String] =
        Map(
          "firstName" -> name.firstName.value,
          "lastName" -> name.lastName.value,
          "amount" -> formatForDisplay(amount.amount),
          "identifier" -> identifier,
          "appDomain" -> domainOf(phoenixUrl))

      private def domainOf(phoenixUrl: PhoenixAppBaseUrl): String =
        new URL(phoenixUrl.value).getHost
    }

    override type TP = CashWithdrawalReservationCreatedParams
    override def subject: EmailSubject = EmailSubject("Cash Withdrawal Reservation Created")
    override def templateName: TemplateName = "cash_withdrawal_reservation_created"
  }

  case object ChequeWithdrawalInitiated extends EmailNotification {
    override type TP = ChequeWithdrawalPunterNotificationParams
    override def subject: EmailSubject = EmailSubject("Cheque Withdrawal Initiated")
    override def templateName: TemplateName = "cheque_withdrawal_initiated"
  }

  object ChequeWithdrawalAccepted extends EmailNotification {
    override type TP = ChequeWithdrawalPunterNotificationParams
    override def subject: EmailSubject = EmailSubject("Cheque Withdrawal Accepted")
    override def templateName: TemplateName = "cheque_withdrawal_accepted"
  }

  object ChequeWithdrawalRejected extends EmailNotification {
    override type TP = ChequeWithdrawalPunterNotificationParams
    override def subject: EmailSubject = EmailSubject("Cheque Withdrawal Rejected")
    override def templateName: TemplateName = "cheque_withdrawal_rejected"
  }

  final case class ChequeWithdrawalPunterNotificationParams(moneyAmount: MoneyAmount) extends TemplatingParams {
    override def toMap: Map[String, String] =
      Map("amount" -> formatForDisplay(moneyAmount.amount))
  }
}

object CustomerServiceNotifications {
  object PunterSuspendedNotification extends EmailNotification {
    final case class Params(suspensionReason: String, punterBackofficeUrl: TalonAppIndividualPunterUrl)
        extends TemplatingParams {
      override def toMap: Map[String, String] =
        Map("suspensionReason" -> suspensionReason, "punterBackofficeUrl" -> punterBackofficeUrl.value)
    }

    override type TP = Params
    override def subject: EmailSubject = EmailSubject("Punter account suspended")
    override def templateName: TemplateName = "punter_suspended"
  }

  object PlayerHasSelfExcludedNotification extends EmailNotification {
    final case class Params(punterBackofficeUrl: TalonAppIndividualPunterUrl) extends TemplatingParams {
      override def toMap: Map[String, String] = Map("punterBackofficeUrl" -> punterBackofficeUrl.value)
    }

    override type TP = Params
    override def subject: EmailSubject = EmailSubject("A player has self excluded")
    override def templateName: TemplateName = "player_has_self_excluded"
  }

  object ChequeWithdrawalInitiated extends EmailNotification {
    final case class Params(
        amount: DefaultCurrencyMoney,
        name: PersonalName,
        reservationId: ReservationId,
        punterBackofficeUrl: TalonAppIndividualPunterUrl)
        extends TemplatingParams {

      override def toMap: Map[String, String] =
        Map(
          "amount" -> formatForDisplay(amount.amount),
          "firstName" -> name.firstName.value,
          "lastName" -> name.lastName.value,
          "punterTransactionsUrl" -> transactionsPage(punterBackofficeUrl),
          "transactionId" -> reservationId.unwrap)

      private def transactionsPage(punterUrl: TalonAppIndividualPunterUrl): String =
        Uri(punterUrl.value).withRawQueryString("activityDetails=walletHistory").toString()
    }

    override type TP = Params
    override def subject: EmailSubject = EmailSubject("Cheque Withdrawal Initiated")
    override def templateName: TemplateName = "cheque_withdrawal_initiated_cs"
  }
}
