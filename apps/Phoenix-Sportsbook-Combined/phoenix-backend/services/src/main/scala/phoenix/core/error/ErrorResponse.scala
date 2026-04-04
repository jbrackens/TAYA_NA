package phoenix.core.error

import cats.data.NonEmptyList
import io.circe.Codec
import io.circe.Encoder
import io.circe.generic.semiauto._
import sttp.model.StatusCode
import sttp.tapir.Schema

final case class ErrorResponse(status: Int, errors: NonEmptyList[PresentationError])
object ErrorResponse {
  def tupled(status: StatusCode, error: PresentationError): (StatusCode, ErrorResponse) =
    status -> ErrorResponse.one(status, error)

  def tupled(status: StatusCode, errorCode: PresentationErrorCode): (StatusCode, ErrorResponse) =
    ErrorResponse.tupled(status, PresentationError(errorCode, details = None))

  def one(status: StatusCode, error: PresentationError): ErrorResponse =
    ErrorResponse(status.code, NonEmptyList.one(error))

  private implicit val errorDetailsCodec: Codec[ErrorDetails] = deriveCodec
  private implicit val presentationErrorEncoder: Encoder[PresentationError] = deriveEncoder

  implicit val errorResponseEncoder: Encoder[ErrorResponse] = deriveEncoder
}

final case class PresentationError(errorCode: PresentationErrorCode, details: Option[ErrorDetails])
final case class ErrorDetails(message: String)

sealed trait PresentationErrorCode {
  def value: String
}
object PresentationErrorCode {
  object TermsAlreadyExist extends PresentationErrorCode {
    override val value: String = "termsAlreadyExist"
  }
  object UnauthorizedRequest extends PresentationErrorCode {
    override val value: String = "unauthorizedRequest"
  }
  object UnauthorisedResponseDuringLogin extends PresentationErrorCode {
    override val value: String = "unauthorisedResponseDuringLogin"
  }
  object UnauthorisedResponseRequiringPasswordReset extends PresentationErrorCode {
    override val value: String = "unauthorisedResponseRequiringPasswordReset"
  }
  object PunterShouldResetPassword extends PresentationErrorCode {
    override val value: String = "punterShouldResetPassword"
  }
  object MissingMFAVerification extends PresentationErrorCode {
    override val value: String = "missingMFAVerification"
  }
  object IncorrectMFAVerification extends PresentationErrorCode {
    override val value: String = "incorrectMFAVerification"
  }
  object InvalidPhoneNumber extends PresentationErrorCode {
    override val value: String = "invalidPhoneNumber"
  }
  object MFAVerificationFailure extends PresentationErrorCode {
    override val value: String = "mfaVerificationFailure"
  }
  object MaxMFASendCodeAttemptsReached extends PresentationErrorCode {
    override val value: String = "maxMFASendCodeAttemptsReached"
  }
  object MaxMFACheckAttemptsReached extends PresentationErrorCode {
    override val value: String = "maxMFACheckAttemptsReached"
  }
  object MFAChangeNotAllowed extends PresentationErrorCode {
    override val value: String = "mfaSettingChangeNotAllowed"
  }
  object IncorrectMFAVerificationWithPasswordReset extends PresentationErrorCode {
    override val value: String = "incorrectMFAVerificationWithPasswordReset"
  }
  object InvalidVerificationCode extends PresentationErrorCode {
    override val value: String = "invalidVerificationCode"
  }
  object ConflictingPunterInformation extends PresentationErrorCode {
    override val value: String = "conflictingPunterInformation"
  }
  object RegistrationInformationFailure extends PresentationErrorCode {
    override val value: String = "registrationInformationFailure"
  }
  object RegistrationInformationAdjusting extends PresentationErrorCode {
    override val value: String = "registrationInformationAdjusting"
  }
  object RegistrationInformationQuestionsExpired extends PresentationErrorCode {
    override val value: String = "registrationInformationQuestionsExpired"
  }
  object PhotoVerificationNotCompleted extends PresentationErrorCode {
    override val value: String = "photoVerificationNotCompleted"
  }
  object MaximumAmountOfPuntersCheckNotPassed extends PresentationErrorCode {
    override val value: String = "maximumAmountOfPuntersCheckNotPassed"
  }
  object AgeRestrictionNotPassed extends PresentationErrorCode {
    override val value: String = "ageRestrictionNotPassed"
  }
  object CannotVerifyPunter extends PresentationErrorCode {
    override val value: String = "cannotVerifyPunter"
  }
  object InvalidAuthToken extends PresentationErrorCode {
    override val value: String = "invalidAuthToken"
  }
  object InvalidRefreshToken extends PresentationErrorCode {
    override val value: String = "invalidRefreshToken"
  }
  object MissingAuthToken extends PresentationErrorCode {
    override val value: String = "missingAuthToken"
  }
  object InactiveAuthToken extends PresentationErrorCode {
    override val value: String = "inactiveAuthToken"
  }
  object SessionNotFound extends PresentationErrorCode {
    override val value: String = "sessionNotFound"
  }
  object UserMissingAdminRole extends PresentationErrorCode {
    override val value: String = "userMissingAdminRole"
  }
  object UserMissingPredictionOpsRole extends PresentationErrorCode {
    override val value: String = "userMissingPredictionOpsRole"
  }
  object UnableToOpenBet extends PresentationErrorCode {
    override val value: String = "unableToOpenBet"
  }
  object UnexpectedBetState extends PresentationErrorCode {
    override val value: String = "unexpectedBetState"
  }
  object GeolocationHeaderNotFound extends PresentationErrorCode {
    override val value: String = "geolocationHeaderNotFound"
  }
  object GeolocationNotAllowed extends PresentationErrorCode {
    override val value: String = "geolocationNotAllowed"
  }
  object FixtureNotFound extends PresentationErrorCode {
    override val value: String = "fixtureNotFound"
  }
  object MarketNotFound extends PresentationErrorCode {
    override val value: String = "marketNotFound"
  }
  object PredictionMarketNotOpen extends PresentationErrorCode {
    override val value: String = "predictionMarketNotOpen"
  }
  object PredictionStakeInvalid extends PresentationErrorCode {
    override val value: String = "predictionStakeInvalid"
  }
  object PredictionOrderNotFound extends PresentationErrorCode {
    override val value: String = "predictionOrderNotFound"
  }
  object PredictionOrderNotCancellable extends PresentationErrorCode {
    override val value: String = "predictionOrderNotCancellable"
  }
  object MarketNotBettable extends PresentationErrorCode {
    override val value: String = "marketNotBettable"
  }
  object CannotSettleMarket extends PresentationErrorCode {
    override val value: String = "cannotSettleMarket"
  }
  object CannotResettleMarket extends PresentationErrorCode {
    override val value: String = "cannotResettleMarket"
  }
  object SelectionNotFound extends PresentationErrorCode {
    override val value: String = "selectionNotFound"
  }
  object SelectionOddsHaveChanged extends PresentationErrorCode {
    override val value: String = "selectionOddsHaveChanged"
  }
  object CannotCancelMarket extends PresentationErrorCode {
    override val value: String = "cannotCancelMarket"
  }
  object CannotFreezeMarket extends PresentationErrorCode {
    override val value: String = "cannotFreezeMarket"
  }
  object CannotUnfreezeMarket extends PresentationErrorCode {
    override val value: String = "cannotUnfreezeMarket"
  }
  object PunterProfileAlreadyExists extends PresentationErrorCode {
    override val value: String = "punterProfileAlreadyExists"
  }
  object PunterProfileDoesNotExist extends PresentationErrorCode {
    override val value: String = "punterProfileDoesNotExist"
  }
  object PunterIsNotAllowedToDeposit extends PresentationErrorCode {
    override val value: String = "punterDepositNotAllowed"
  }
  object PunterIsNotAllowedToWithdraw extends PresentationErrorCode {
    override val value: String = "punterWithdrawalNotAllowed"
  }
  object TooSmallWithdrawAmount extends PresentationErrorCode {
    override val value: String = "tooSmallWithdrawAmount"
  }
  object PunterIsSuspended extends PresentationErrorCode {
    override val value: String = "punterIsSuspended"
  }
  object PunterIsDeleted extends PresentationErrorCode {
    override val value: String = "punterIsDeleted"
  }
  object PunterIsNotDeleted extends PresentationErrorCode {
    override val value: String = "punterIsNotDeleted"
  }
  object PunterIsNotSuspended extends PresentationErrorCode {
    override val value: String = "punterIsNotSuspended"
  }
  object PunterWithoutSSN extends PresentationErrorCode {
    override val value: String = "punterWithoutSSN"
  }
  object PunterIsInSelfExclusion extends PresentationErrorCode {
    override val value: String = "punterIsInSelfExclusion"
  }
  object PunterIsNotInSelfExclusion extends PresentationErrorCode {
    override val value: String = "punterIsNotInSelfExclusion"
  }
  object PunterIsInCoolOff extends PresentationErrorCode {
    override val value: String = "punterIsInCoolOff"
  }
  object PunterIsUnverified extends PresentationErrorCode {
    override val value: String = "punterIsUnverified"
  }
  object PunterIsVerified extends PresentationErrorCode {
    override val value: String = "punterIsVerified"
  }
  object PunterCannotBet extends PresentationErrorCode {
    override val value: String = "punterCannotBet"
  }
  object PunterDuplicateSSN extends PresentationErrorCode {
    override val value: String = "punterDuplicateSSN"
  }
  object PunterHasNoActiveSession extends PresentationErrorCode {
    override val value: String = "punterHasNoActiveSession"
  }
  object DepositAmountExceedsLimit extends PresentationErrorCode {
    override val value: String = "depositAmountExceedsLimit"
  }
  object TooSmallDepositAmount extends PresentationErrorCode {
    override val value: String = "tooSmallDepositAmount"
  }
  object WalletAlreadyExists extends PresentationErrorCode {
    override val value: String = "walletAlreadyExists"
  }
  object WalletNotFound extends PresentationErrorCode {
    override val value: String = "walletNotFound"
  }
  object InsufficientFunds extends PresentationErrorCode {
    override val value: String = "insufficientFunds"
  }
  object ReservationNotFound extends PresentationErrorCode {
    override val value: String = "reservationNotFoundError"
  }
  object ReservationAlreadyExists extends PresentationErrorCode {
    override val value: String = "reservationAlreadyExists"
  }
  object InvalidJson extends PresentationErrorCode {
    override val value: String = "invalidJson"
  }
  object CurrentPasswordDoesNotMatchExisting extends PresentationErrorCode {
    override val value: String = "currentPasswordDoesNotMatchExisting"
  }
  object InvalidPassword extends PresentationErrorCode {
    override val value: String = "invalidPassword"
  }
  object NewPasswordInvalid extends PresentationErrorCode {
    override val value: String = "nextPasswordInvalid"
  }
  object AcceptedTermsVersionWasNotTheLatest extends PresentationErrorCode {
    override val value: String = "acceptedTermsVersionWasNotTheLatest"
  }
  object StakeTooHigh extends PresentationErrorCode {
    override def value: String = "stakeTooHigh"
  }
  object StakeLimitsHaveBeenBreached extends PresentationErrorCode {
    override val value: String = "stakeLimitsHaveBeenBreached"
  }
  object PunterNeedsToAcceptResponsibilityCheck extends PresentationErrorCode {
    override val value: String = "punterNeedsToAcceptResponsibilityCheck"
  }
  object InternalError extends PresentationErrorCode {
    override val value: String = "internalError"
  }
  object RequestDecodingFailed extends PresentationErrorCode {
    override val value: String = "decodingError"
  }
  object GeoComplyLicenseKeysNotFound extends PresentationErrorCode {
    override val value: String = "geoComplyLicenseKeysNotFound"
  }
  object SendVerificationCodeFailure extends PresentationErrorCode {
    override val value: String = "sendVerificationCodeFailure"
  }
  object FailedToDecryptGeoPacket extends PresentationErrorCode {
    override val value: String = "failedToDecryptGeoPacket"
  }
  object FailedToParseGeoPacket extends PresentationErrorCode {
    override val value: String = "failedToParseGeoPacket"
  }
  object GeoLocationServiceError extends PresentationErrorCode {
    override val value: String = "geoLocationServiceError"
  }
  object RegisteredUserNotFound extends PresentationErrorCode {
    override val value: String = "registeredUserNotFound"
  }
  object PaymentGatewayIssue extends PresentationErrorCode {
    override val value: String = "paymentGatewayIssue"
  }
  object PaymentTransactionDoesNotExist extends PresentationErrorCode {
    override val value: String = "paymentTransactionDoesNotExist"
  }
  object EmailAlreadyUsed extends PresentationErrorCode {
    override val value: String = "emailAlreadyUsed"
  }
  object EmailChangeError extends PresentationErrorCode {
    override val value: String = "emailChangeError"
  }
  object UndefinedIPAddress extends PresentationErrorCode {
    override val value: String = "undefinedIPAddress"
  }
  object PunterShouldContactCustomerService extends PresentationErrorCode {
    override val value: String = "punterShouldContactCustomerService"
  }
  object InvalidUsername extends PresentationErrorCode {
    override val value: String = "usernameIsInvalid"
  }
  object ReportsNotInitialized extends PresentationErrorCode {
    override def value: String = "reports module not initialized"
  }

  implicit val presentationCodeEncoder: Encoder[PresentationErrorCode] = Encoder.encodeString.contramap(_.value)
  implicit val presentationErrorCodeSchema: Schema[PresentationErrorCode] = Schema.string
}

final case class RegistrationErrorCode(value: String) extends PresentationErrorCode
