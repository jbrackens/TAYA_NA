package phoenix.payments.domain

import scala.collection.immutable._

import cats.syntax.validated._
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.Email
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.Username

final case class RedirectToPaymentScreenUrl(value: String)
final case class PaymentReference(value: String)
final case class PaymentSessionStarted(redirectUrl: RedirectToPaymentScreenUrl, paymentReference: PaymentReference)
final case class PaymentOrigin(originHost: String)

sealed trait PaymentDirection extends EnumEntry with UpperSnakecase {
  def nameAsWord: String = entryName.toLowerCase.capitalize
}
object PaymentDirection extends Enum[PaymentDirection] {
  override def values: IndexedSeq[PaymentDirection] = findValues

  final case object Deposit extends PaymentDirection
  final case object Withdrawal extends PaymentDirection
}

// https://developer.kalixa.com/docs/payment-methods
sealed trait StateDefinition extends EnumEntry with UpperSnakecase
object StateDefinition extends Enum[StateDefinition] {
  override def values: IndexedSeq[StateDefinition] = findValues

  // for visa deposits
  final case object AuthorisedByProvider extends StateDefinition
  final case object PendingToBeCaptured extends StateDefinition
  final case object Cancelled extends StateDefinition

  // for visa withdrawals
  final case object Created extends StateDefinition
  final case object WithdrawnByProvider extends StateDefinition
  final case object RefusedByProvider extends StateDefinition

  // for cash withdrawals
  final case object ToBeWithdrawn extends StateDefinition
  final case object WithdrawnToUser extends StateDefinition
  final case object Expired extends StateDefinition

  // for cash deposits
  final case object DepositedByUser extends StateDefinition

  def fromInt(intValue: Int): Validation[StateDefinition] =
    intValue match {
      case 13  => AuthorisedByProvider.validNel
      case 306 => PendingToBeCaptured.validNel
      case 113 => Cancelled.validNel

      case 232 => Created.validNel
      case 20  => WithdrawnByProvider.validNel
      case 100 => RefusedByProvider.validNel

      case 371 => ToBeWithdrawn.validNel
      case 519 => WithdrawnToUser.validNel
      case 102 => Expired.validNel

      case 525 => DepositedByUser.validNel
      case _   => ValidationException(s"Expected valid state definition key but received '$intValue'").invalidNel
    }
}

sealed trait CreationType extends EnumEntry with UpperSnakecase
object CreationType extends Enum[CreationType] {
  override def values: IndexedSeq[CreationType] = findValues

  // https://developer.kalixa.com/docs/creation-types
  final case object User extends CreationType
  final case object MerchantOperator extends CreationType
  final case object EcomRecurring extends CreationType
  final case object Provider extends CreationType
  final case object MotoRecurring extends CreationType
  final case object EcomInstallment extends CreationType
  final case object MotoInstallment extends CreationType
  final case object MerchantInitiatedWithStoredAccount extends CreationType
  final case object UserInitiatedWithStoredAccount extends CreationType

  def fromInt(intValue: Int): Validation[CreationType] =
    intValue match {
      case 1  => User.validNel
      case 2  => MerchantOperator.validNel
      case 4  => EcomRecurring.validNel
      case 6  => Provider.validNel
      case 7  => MotoRecurring.validNel
      case 8  => EcomInstallment.validNel
      case 9  => MotoInstallment.validNel
      case 10 => MerchantInitiatedWithStoredAccount.validNel
      case 11 => UserInitiatedWithStoredAccount.validNel
      case _  => ValidationException(s"Expected valid creation type key but received '$intValue'").invalidNel
    }
}

sealed trait PaymentMethod extends EnumEntry with UpperSnakecase
object PaymentMethod extends Enum[PaymentMethod] {
  override def values: IndexedSeq[PaymentMethod] = findValues

  // https://developer.kalixa.com/docs/payment-methods
  final case object VisaDeposit extends PaymentMethod {
    val id = 2
  }
  final case object VisaWithdrawal extends PaymentMethod {
    val id = 12
  }
  final case object CashWithdrawal extends PaymentMethod {
    val id = 174
  }
  final case object CashDeposit extends PaymentMethod {
    val id = 177
  }

  def fromInt(intValue: Int): Validation[PaymentMethod] =
    intValue match {
      case VisaDeposit.id    => VisaDeposit.validNel
      case VisaWithdrawal.id => VisaWithdrawal.validNel
      case CashWithdrawal.id => CashWithdrawal.validNel
      case CashDeposit.id    => CashDeposit.validNel
      case _                 => ValidationException(s"Expected valid payment method key but received '$intValue'").invalidNel
    }
}

final case class PaymentStateChangedNotification(
    punterId: PunterId,
    transactionId: TransactionId,
    paymentId: PaymentId,
    amount: PositiveAmount[DefaultCurrencyMoney],
    paymentMethod: PaymentMethod,
    stateDefinition: StateDefinition,
    creationType: CreationType) {

  def uniqueIdentifier: NotificationIdentifier = NotificationIdentifier(transactionId, paymentId, stateDefinition)
}

final case class NotificationIdentifier(
    transactionId: TransactionId,
    paymentId: PaymentId,
    stateDefinition: StateDefinition)

final case class PaymentStateChangedNotificationResponse private (key: Int, value: String)
object PaymentStateChangedNotificationResponse {
  val processedSuccessfully: PaymentStateChangedNotificationResponse =
    PaymentStateChangedNotificationResponse(0, "ProcessedSuccessfully")
  val unknownState: PaymentStateChangedNotificationResponse =
    PaymentStateChangedNotificationResponse(2, "UnknownState")
  val refusedByRiskManagement: PaymentStateChangedNotificationResponse =
    PaymentStateChangedNotificationResponse(3, "RefusedByRiskManagement")
  val errorProcessingEvent: PaymentStateChangedNotificationResponse =
    PaymentStateChangedNotificationResponse(10, "ErrorProcessingEvent")
  val blockedByMerchant: PaymentStateChangedNotificationResponse =
    PaymentStateChangedNotificationResponse(15, "BlockedByMerchant")
}
sealed trait CashDepositVerificationRequest
final case class EmailCashDepositVerification(email: Email) extends CashDepositVerificationRequest
final case class UsernameCashDepositVerification(username: Username) extends CashDepositVerificationRequest
final case class UsernameAndEmailCashDepositVerification(username: Username, email: Email)
    extends CashDepositVerificationRequest

sealed trait CashDepositVerificationResponse
final case class CashDepositVerificationSuccessResponse(
    punterId: PunterId,
    transactionId: TransactionId,
    userDetails: PunterPersonalDetails,
    paymentLimits: PaymentLimits,
    ssn: Last4DigitsOfSSN)
    extends CashDepositVerificationResponse
final case class PaymentLimits(min: MoneyAmount, max: MoneyAmount)

final case class CashDepositVerificationFailureResponse private (code: Int, description: String, message: String)
    extends CashDepositVerificationResponse

object CashDepositVerificationFailureResponse {

  private def createWithMessageForCasinoEmployee(message: String): CashDepositVerificationFailureResponse =
    CashDepositVerificationFailureResponse(2, "UserNotFound", message)

  val userNotFound = createWithMessageForCasinoEmployee("Unable to locate User")
  val invalidEmailAddress = createWithMessageForCasinoEmployee("Invalid email address")
  val missingRequiredFields = createWithMessageForCasinoEmployee("Didn't receive a username or email address")
  val multipleUsersFound = createWithMessageForCasinoEmployee(
    "Username and email address supplied refer to two different users")
  val userNotAllowedToDeposit = createWithMessageForCasinoEmployee("User is not allowed to deposit")
}
