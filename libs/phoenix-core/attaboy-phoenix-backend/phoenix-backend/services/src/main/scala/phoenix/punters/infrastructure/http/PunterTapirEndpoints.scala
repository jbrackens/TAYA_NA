package phoenix.punters.infrastructure.http

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.duration.FiniteDuration

import io.scalaland.chimney.dsl._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._

import phoenix.core.currency.PositiveAmount
import phoenix.core.error.ErrorResponse
import phoenix.core.pagination.PaginatedResult
import phoenix.http.core.TapirAuthDirectives
import phoenix.http.core.TapirAuthDirectives.endpointWithError
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.EndpointInputs.baseUrl.phoenixAppBaseUrlInput
import phoenix.http.routes.EndpointInputs.optionalIpAddress
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.jwt.JwtAuthenticator
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterCoolOffBegan
import phoenix.punters.application.LoginProcess.LoggedIn
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain.Address
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Email
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.RefreshToken
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.UserPreferences
import phoenix.punters.domain.UserProfile
import phoenix.punters.domain.UserTokenResponse
import phoenix.punters.domain.Username
import phoenix.punters.domain._
import phoenix.punters.idcomply.application.AnswerKBAQuestionsOutput
import phoenix.punters.idcomply.application.RegistrationResponse
import phoenix.punters.idcomply.domain.Answer
import phoenix.punters.idcomply.domain.IDPVUrl
import phoenix.punters.idcomply.infrastructure.RegistrationJsonFormats._
import phoenix.punters.infrastructure.PunterJsonFormats._
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.DebitFundsReason
import phoenix.wallets.domain.Funds.RealMoney

object PunterTapirEndpoints extends TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.config.infrastructure.http.ConfigTapirSchemas._
  import phoenix.punters.idcomply.infrastructure.http.RegistrationTapirSchemas._
  import phoenix.punters.infrastructure.http.PunterTapirSchemas._

  implicit val schemaForScalaFiniteDuration: Schema[scala.concurrent.duration.FiniteDuration] = Schema.string

  sealed trait HasMultifactorVerification {
    def verificationId: MultifactorVerificationId
    def verificationCode: MultifactorVerificationCode
  }

  final case class LoginRequest(
      username: Username,
      password: MaybeValidPassword,
      deviceFingerprint: Option[DeviceFingerprint])

  sealed trait LoginResponse extends Product with Serializable
  object LoginResponse {
    final case class LoggedInResponse(loggedIn: LoggedIn) extends LoginResponse
    final case class VerificationRequestedResponse(verificationId: MultifactorVerificationId) extends LoginResponse
  }

  final case class LoginWithVerificationRequest(
      username: Username,
      password: MaybeValidPassword,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode,
      deviceFingerprint: Option[DeviceFingerprint])
      extends HasMultifactorVerification

  final case class BeginCoolOffRequest(duration: FiniteDuration)
  final case class SelfExcludeRequest(
      duration: SelfExclusionDuration,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode)
      extends HasMultifactorVerification
  final case class SuspendPunterRequest(entity: SuspensionEntity)

  final case class DebitFundsRequest(
      details: String,
      amount: PositiveAmount[RealMoney],
      reason: Option[DebitFundsReason])
  final case class CreditFundsRequest(
      details: String,
      amount: PositiveAmount[RealMoney],
      reason: Option[CreditFundsReason])

  final case class GetSessionTimerResponse(currentTime: OffsetDateTime, sessionStartTime: OffsetDateTime)

  final case class SignUpVerification(id: MultifactorVerificationId, code: MultifactorVerificationCode)

  final case class SignUpRequest(
      name: PersonalName,
      username: Username,
      email: Email,
      phoneNumber: MobilePhoneNumber,
      password: MaybeValidPassword,
      address: Address,
      dateOfBirth: DateOfBirth,
      gender: Option[Gender],
      ssn: Last4DigitsOfSSN,
      referralCode: Option[ReferralCode],
      deviceFingerprint: Option[DeviceFingerprint])

  final case class TestAccountSignUpRequest(
      name: PersonalName,
      username: Username,
      email: Email,
      phoneNumber: MobilePhoneNumber,
      password: MaybeValidPassword,
      address: Address,
      dateOfBirth: DateOfBirth,
      gender: Option[Gender],
      ssn: FullSSN,
      referralCode: Option[ReferralCode],
      verification: Option[SignUpVerification])

  final case class AnswerKBAQuestionsRequest(punterId: PunterId, answers: List[Answer])

  final case class CheckIDPVStatusRequest(punterId: PunterId)

  final case class StartIDPVResponse(idpvRedirectUrl: IDPVUrl)

  final case class ForgotPasswordRequest(email: Email)

  final case class ResetPasswordRequest(
      password: MaybeValidPassword,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode)

  final case class ChangePasswordRequest(
      currentPassword: MaybeValidPassword,
      newPassword: MaybeValidPassword,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode)
      extends HasMultifactorVerification

  final case class PhoneVerificationRequest(phoneNumber: MobilePhoneNumber, deviceFingerprint: DeviceFingerprint)

  final case class RequestVerificationResponse(verificationId: MultifactorVerificationId)

  final case class RefreshTokenRequest(refresh_token: RefreshToken)
  final case class RefreshTokenResponse(token: UserTokenResponse)

  final case class GetTermsResponse(version: CurrentTermsVersion, content: TermsContent)

  final case class AcceptTermsRequest(version: TermsAcceptedVersion)

  final case class CreateBackofficeUserRequest(email: Email, username: Username, personalName: PersonalName)
  final case class UpdatePunterDetailsRequest(name: PersonalName, address: Address, phoneNumber: MobilePhoneNumber)
  final case class UpdatePunterDobRequest(dateOfBirth: DateOfBirth)
  final case class UpdatePunterAddressRequest(address: Address)
  final case class UpdatePunterPersonalNameRequest(personalName: PersonalName)
  final case class UpdatePunterPhoneNumberRequest(phoneNumber: MobilePhoneNumber)

  final case class UpdateEmailRequest(
      newEmail: Email,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode)
      extends HasMultifactorVerification

  final case class UpdateMFAEnabledStatusRequest(
      enabled: Boolean,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode)
      extends HasMultifactorVerification

  final case class RejectTransactionRequest(reason: String)

  final case class UpdateSSNRequest(ssn: FullSSN)
  final case class PunterSSNResponse(ssn: Option[FullSSN])

  final case class FinancialSummaryResponse(
      currentBalance: RealMoney,
      openedBets: RealMoney,
      pendingWithdrawals: RealMoney,
      lifetimeDeposits: RealMoney,
      lifetimeWithdrawals: RealMoney,
      netCash: RealMoney)

  def login(puntersBoundedContext: PuntersBoundedContext, authenticationRepository: AuthenticationRepository)(implicit
      ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_NegativeEndpoint[LoginRequest](
        jsonBody[LoginRequest],
        loginRequest => authenticationRepository.findUser(UserLookupId.byUsername(loginRequest.username)),
        puntersBoundedContext)
      .post
      .in("login")
      .in(optionalIpAddress)
      .out(jsonBody[LoginResponse])
      .out(statusCode(StatusCode.Ok))

  def loginWithVerification(
      puntersBoundedContext: PuntersBoundedContext,
      authenticationRepository: AuthenticationRepository)(implicit ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_NegativeEndpoint[LoginWithVerificationRequest](
        jsonBody[LoginWithVerificationRequest],
        loginRequest => authenticationRepository.findUser(UserLookupId.byUsername(loginRequest.username)),
        puntersBoundedContext)
      .post
      .in("login-with-verification")
      .in(optionalIpAddress)
      .out(jsonBody[LoggedIn])
      .out(statusCode(StatusCode.Ok))

  def logout(puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_NegativeAndUnverifiedEndpointJwt(puntersBoundedContext)
      .post
      .in("logout")
      .out(statusCode(StatusCode.Ok))

  def coolOff(puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActiveAndNegativePunterEndpointJwt(puntersBoundedContext)
      .post
      .in("punters" / "cool-off")
      .in(jsonBody[BeginCoolOffRequest])
      .out(jsonBody[PunterCoolOffBegan])
      .out(statusCode(StatusCode.Ok))

  def selfExclude(puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_NegativeEndpointJwt(puntersBoundedContext)
      .post
      .in("punters" / "self-exclude")
      .in(jsonBody[SelfExcludeRequest])
      .out(statusCode(StatusCode.Ok))

  def setDepositLimit(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .post
      .in("punters" / "deposit-limits")
      .in(jsonBody[Limits[DepositLimitAmount]])
      .out(jsonBody[CurrentAndNextLimits[DepositLimitAmount]])
      .out(statusCode(StatusCode.Ok))

  def setSessionLimits(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .post
      .in("punters" / "session-limits")
      .in(jsonBody[Limits[SessionDuration]])
      .out(jsonBody[CurrentAndNextLimits[SessionDuration]])
      .out(statusCode(StatusCode.Ok))

  def setStakeLimits(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .post
      .in("punters" / "stake-limits")
      .in(jsonBody[Limits[StakeLimitAmount]])
      .out(jsonBody[CurrentAndNextLimits[StakeLimitAmount]])
      .out(statusCode(StatusCode.Ok))

  def getLimitsHistory(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_NegativeEndpointJwt(puntersBoundedContext)
      .get
      .in("punters" / "limits-history")
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[LimitChange]])
      .out(statusCode(StatusCode.Ok))

  def getCoolOffsHistory(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_NegativeEndpointJwt(puntersBoundedContext)
      .get
      .in("punters" / "cool-offs-history")
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[PunterCoolOffEntry]])
      .out(statusCode(StatusCode.Ok))

  def getCurrentSession(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives.punterEndpoint.get
      .in("punters" / "current-session")
      .out(jsonBody[GetSessionTimerResponse])
      .out(statusCode(StatusCode.Ok))

  val registrationSignUp =
    endpoint.post
      .in("registration" / "sign-up")
      .in(jsonBody[SignUpRequest])
      .in(optionalIpAddress)
      .out(jsonBody[RegistrationResponse])
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  val answerKBAQuestions =
    endpoint.post
      .in("registration" / "answer-kba-questions")
      .in(jsonBody[AnswerKBAQuestionsRequest])
      .out(jsonBody[AnswerKBAQuestionsOutput])
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  def startIDPV(puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowUnverifiedEndpointJwt(puntersBoundedContext)
      .post
      .in("registration" / "start-idpv")
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[StartIDPVResponse])

  val checkIDPVStatus =
    endpoint.post
      .in("registration" / "check-idpv-status")
      .in(jsonBody[CheckIDPVStatusRequest])
      .out(statusCode(StatusCode.Created))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  val forgotPassword =
    endpoint.post
      .in("password" / "forgot")
      .in(jsonBody[ForgotPasswordRequest])
      .in(phoenixAppBaseUrlInput)
      .out(statusCode(StatusCode.Ok))

  val resetPassword =
    endpoint
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])
      .in("password" / "reset" / path[UUID])
      .in(jsonBody[ResetPasswordRequest])
      .post
      .out(statusCode(StatusCode.NoContent))

  def changePassword(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .post
      .in("password" / "change")
      .in(jsonBody[ChangePasswordRequest])
      .out(statusCode(StatusCode.NoContent))

  val activateAccount =
    endpointWithError.in("account" / "activate" / path[UUID]).put.out(statusCode(StatusCode.Ok))

  def requestVerification(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_NegativeAndUnverifiedEndpointJwt(puntersBoundedContext)
      .post
      .in("verification" / "request")
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[RequestVerificationResponse])

  val requestVerificationForEmailVerifiedUser =
    endpointWithError
      .in("verification" / "request-by-verification-code" / path[UUID])
      .post
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[RequestVerificationResponse])

  def requestVerificationForUserByPhone =
    endpoint.post
      .in("verification" / "request-by-phone")
      .in(jsonBody[PhoneVerificationRequest])
      .in(optionalIpAddress)
      .out(jsonBody[RequestVerificationResponse])
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  val checkVerification =
    endpoint.post
      .in("verification" / "check")
      .in(jsonBody[SignUpVerification])
      .in(optionalIpAddress)
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  val refreshToken =
    endpoint.post
      .in("token" / "refresh")
      .in(jsonBody[RefreshTokenRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[RefreshTokenResponse])
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  val getTerms =
    endpoint.get.in("terms").out(statusCode(StatusCode.Ok)).out(jsonBody[GetTermsResponse])

  def acceptTerms(puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .put
      .in("terms" / "accept")
      .in(jsonBody[AcceptTermsRequest])
      .out(statusCode(StatusCode.Ok))

  def retrievePunterProfile(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActive_CoolOff_NegativeAndUnverifiedEndpointJwt(puntersBoundedContext)
      .get
      .in("profile" / "me")
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[PunterProfileForPunterPresentation])

  def updatePunterDetails(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .put
      .in("profile" / "details")
      .in(jsonBody[UpdatePunterDetailsRequest])
      .out(statusCode(StatusCode.NoContent))

  def updatePunterPreferences(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .put
      .in("profile" / "preferences")
      .in(jsonBody[UserPreferences])
      .out(statusCode(StatusCode.NoContent))

  def updatePunterEmail(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .put
      .in("profile" / "email")
      .in(jsonBody[UpdateEmailRequest])
      .out(statusCode(StatusCode.NoContent))

  def updateMultifactorAuthenticationEnabledStatus(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    TapirAuthDirectives
      .allowActivePunterEndpointJwt(puntersBoundedContext)
      .put
      .in("profile" / "multi-factor-authentication")
      .in(jsonBody[UpdateMFAEnabledStatusRequest])
      .out(statusCode(StatusCode.NoContent))
}

final case class PunterProfileForPunterPresentation(
    userId: UserId,
    username: Username,
    name: PersonalName,
    address: Address,
    email: Email,
    phoneNumber: MobilePhoneNumber,
    dateOfBirth: DateOfBirth,
    gender: Option[Gender],
    twoFactorAuthEnabled: Boolean,
    depositLimits: CurrentAndNextLimits[DepositLimitAmount],
    stakeLimits: CurrentAndNextLimits[StakeLimitAmount],
    sessionLimits: CurrentAndNextLimits[SessionDuration],
    communicationPreferences: CommunicationPreferences,
    bettingPreferences: BettingPreferences,
    status: PunterStatus,
    coolOff: Option[CoolOffStatus],
    terms: TermsAgreement,
    hasToAcceptTerms: Boolean,
    signUpDate: OffsetDateTime,
    lastSignIn: Option[SignInTimestamp],
    hasToAcceptResponsibilityCheck: Boolean,
    ssn: SocialSecurityNumber.Last4DigitsOfSSN)

object PunterProfileForPunterPresentation {
  def from(userProfile: UserProfile): PunterProfileForPunterPresentation =
    userProfile.into[PunterProfileForPunterPresentation].transform
}
