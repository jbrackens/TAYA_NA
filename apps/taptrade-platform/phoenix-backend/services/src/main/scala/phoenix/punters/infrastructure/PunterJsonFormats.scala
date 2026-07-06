package phoenix.punters.infrastructure

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.duration.Duration
import scala.concurrent.duration.FiniteDuration

import cats.data.Validated
import io.circe._
import io.circe.generic.semiauto._

import phoenix.core.JsonFormats._
import phoenix.core.ScalaObjectUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.JsonFormats._
import phoenix.core.currency.MoneyAmount
import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterSummary
import phoenix.punters.PuntersBoundedContext._
import phoenix.punters.application.LoginProcess.LoggedIn
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain.Address
import phoenix.punters.domain.BettingPreferences
import phoenix.punters.domain.CommunicationPreferences
import phoenix.punters.domain.CoolOffPeriod
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Email
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.PunterStatus
import phoenix.punters.domain.RefreshToken
import phoenix.punters.domain.Session
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.SocialSecurityNumber.First5DigitsOfSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.SuspensionEntity._
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.UserId
import phoenix.punters.domain.UserPreferences
import phoenix.punters.domain.UserProfile
import phoenix.punters.domain.UserTokenResponse
import phoenix.punters.domain.Username
import phoenix.punters.domain.Zipcode
import phoenix.punters.domain._
import phoenix.punters.infrastructure.http.PunterProfileForPunterPresentation
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.AcceptTermsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.BeginCoolOffRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.ChangePasswordRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.CreateBackofficeUserRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.CreditFundsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.DebitFundsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.FinancialSummaryProductBreakdown
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.FinancialSummaryResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.ForgotPasswordRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.GetSessionTimerResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.GetTermsResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.LoginRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.LoginResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.LoginResponse.LoggedInResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.LoginResponse.VerificationRequestedResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.LoginWithVerificationRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.PhoneVerificationRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.PredictionProductSummary
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.ProductExposureSummary
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.PunterSSNResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.RefreshTokenRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.RefreshTokenResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.RejectTransactionRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.RequestVerificationResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.ResetPasswordRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SelfExcludeRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpVerification
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SuspendPunterRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.TestAccountSignUpRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdateEmailRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdateMFAEnabledStatusRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterAddressRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterDetailsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterDobRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterPersonalNameRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterPhoneNumberRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdateSSNRequest
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.DebitFundsReason
import phoenix.wallets.domain.Funds.RealMoney

object PunterJsonFormats {

  implicit val adminIdCodec: Codec[AdminId] = Codec[String].bimap(_.value, AdminId.apply)
  implicit val punterIdCodec: Codec[PunterId] = Codec[String].bimap(_.value, PunterId.apply)
  implicit val referralCodeCodec: Codec[ReferralCode] = Codec[String].bimap(_.value, ReferralCode.apply)
  implicit val sessionIdCodec: Codec[SessionId] = Codec[String].bimap(_.value, SessionId.apply)
  implicit val userIdCodec: Codec[UserId] = Codec[UUID].bimap(_.value, UserId.apply)
  implicit val usernameCodec: Codec[Username] = Codec[String].bimapValidated(_.value, Username.apply)
  implicit val visitorIdCodec: Codec[VisitorId] = Codec[String].bimapValidated(_.value, VisitorId.apply)
  implicit val confidenceCodec: Codec[Confidence] = Codec[Float].bimapValidated(_.value, Confidence.apply)
  implicit val deviceFingerprintCodec: Codec[DeviceFingerprint] = deriveCodec
  implicit val termsAcceptedVersionCodec: Codec[TermsAcceptedVersion] =
    Codec[Int].bimap(_.value, TermsAcceptedVersion.apply)
  implicit val refreshTokenCodec: Codec[RefreshToken] = Codec[String].bimap(_.value, RefreshToken.apply)
  implicit val currentTermsVersionCodec: Codec[CurrentTermsVersion] =
    Codec[Int].bimap(_.value, CurrentTermsVersion.apply)
  implicit val termsContentCodec: Codec[TermsContent] = Codec[String].bimap(_.value, TermsContent.apply)
  implicit val mobilePhoneNumberCodec: Codec[MobilePhoneNumber] = Codec[String].bimap(_.value, MobilePhoneNumber.apply)
  implicit val maybeValidPasswordCodec: Codec[MaybeValidPassword] =
    Codec[String].bimap(_.value, MaybeValidPassword.apply)
  implicit val emailCodec: Codec[Email] = Codec[String].bimapValidated(_.value, Email.fromString)
  implicit val socialSecurityNumberCodec: Codec[Last4DigitsOfSSN] =
    Codec[String].bimapValidated(_.value, Last4DigitsOfSSN.fromString)
  implicit val fullSocialSecurityNumberCodec: Codec[FullSSN] = Codec[String].bimapValidated(_.value, FullSSN.fromString)
  implicit val depositLimitAmountCodec: Codec[DepositLimitAmount] =
    Codec[BigDecimal]
      .bimapValidated(_.value.amount, decimal => DepositLimitAmount.fromMoneyAmount(MoneyAmount(decimal)))
  implicit val lossLimitAmountCodec: Codec[StakeLimitAmount] =
    Codec[BigDecimal].bimapValidated(_.value.amount, decimal => StakeLimitAmount.fromMoneyAmount(MoneyAmount(decimal)))
  implicit val addressLineCodec: Codec[AddressLine] = Codec[String].bimapValidated(_.value, AddressLine.apply)
  implicit val cityCodec: Codec[City] = Codec[String].bimapValidated(_.value, City.apply)
  implicit val stateCodec: Codec[State] = Codec[String].bimapValidated(_.value, State.apply)
  implicit val zipcodeCodec: Codec[Zipcode] = Codec[String].bimapValidated(_.value, Zipcode.apply)
  implicit val countryCodec: Codec[Country] = Codec[String].bimapValidated(_.value, Country.apply)

  implicit val verificationIdCodec: Codec[MultifactorVerificationId] =
    Codec[String].bimap(_.value, MultifactorVerificationId.apply)
  implicit val verificationCodeCodec: Codec[MultifactorVerificationCode] =
    Codec[String].bimapValidated(_.value, MultifactorVerificationCode.apply)

  implicit val realMoneyCodec: Codec[RealMoney] = Codec[DefaultCurrencyMoney].bimap(_.value, RealMoney(_))

  implicit val debitFundsReasonCodec: Codec[DebitFundsReason] = enumCodec(DebitFundsReason)
  implicit val creditFundsReasonCodec: Codec[CreditFundsReason] = enumCodec(CreditFundsReason)

  implicit val debitFundsRequestCodec: Codec[DebitFundsRequest] = deriveCodec

  implicit val creditFundsRequestCodec: Codec[CreditFundsRequest] = deriveCodec

  implicit val sessionDurationCodec: Codec[SessionDuration] =
    Codec[FiniteDuration].bimap(sd => Duration.fromNanos(sd.nanos), SessionDuration.apply)

  private def limitsDecoder[V, T: Decoder](decodeLimits: (T, T, T) => Validation[Limits[V]]): Decoder[Limits[V]] =
    Decoder.instance((c: HCursor) =>
      for {
        daily <- c.downField("daily").as[T]
        weekly <- c.downField("weekly").as[T]
        monthly <- c.downField("monthly").as[T]
        validated = decodeLimits(daily, weekly, monthly)
        result <- validated.map(Right(_)).valueOr { errors =>
          val details = errors.map(_.message).toList.mkString
          c.fail(s"Couldn't decode Limits due to validation errors [$details]")
        }
      } yield result)

  implicit val sessionLimitsDecoder: Decoder[Limits[SessionDuration]] =
    limitsDecoder(
      Limits.validatedWithCustomValidationPerLimitType[FiniteDuration, SessionDuration](finiteDuration =>
        Validated.valid(SessionDuration.apply(finiteDuration)))(
        dayValidation = SessionLimits.Daily.apply _,
        weekValidation = SessionLimits.Weekly.apply _,
        monthValidation = SessionLimits.Monthly.apply _))

  implicit val depositLimitsDecoder: Decoder[Limits[DepositLimitAmount]] =
    limitsDecoder(Limits.validateFromRawValues(DepositLimitAmount.fromMoneyAmount))

  implicit val stakeLimitsCodec: Decoder[Limits[StakeLimitAmount]] =
    limitsDecoder(Limits.validateFromRawValues(StakeLimitAmount.fromMoneyAmount))

  private def currentAndNextLimitsCodec[V: Codec]: Codec[CurrentAndNextLimits[V]] =
    new Codec[CurrentAndNextLimits[V]] {
      private implicit val limitCodec: Codec[JsonLimit] = deriveCodec
      private implicit val limitsCodec: Codec[JsonLimits] = deriveCodec[JsonLimits].dropNullValues
      private implicit val periodLimitsCodec: Codec[PeriodLimits] = deriveCodec

      override def apply(c: HCursor): Decoder.Result[CurrentAndNextLimits[V]] =
        periodLimitsCodec(c).map(convert)

      override def apply(limits: CurrentAndNextLimits[V]): Json =
        periodLimitsCodec(convert(limits))

      private def convert(limits: CurrentAndNextLimits[V]): PeriodLimits =
        PeriodLimits(convert(limits.daily), convert(limits.weekly), convert(limits.monthly))

      private def convert(limits: PeriodLimits): CurrentAndNextLimits[V] = {
        val daily =
          CurrentAndNextLimit(
            current = EffectiveLimit(Limit.Daily(limits.daily.current.limit), limits.daily.current.since),
            next = limits.daily.next.map(l => EffectiveLimit(Limit.Daily(l.limit), l.since)))
        val weekly =
          CurrentAndNextLimit(
            current = EffectiveLimit(Limit.Weekly(limits.weekly.current.limit), limits.weekly.current.since),
            next = limits.weekly.next.map(l => EffectiveLimit(Limit.Weekly(l.limit), l.since)))
        val monthly =
          CurrentAndNextLimit(
            current = EffectiveLimit(Limit.Monthly(limits.monthly.current.limit), limits.monthly.current.since),
            next = limits.monthly.next.map(l => EffectiveLimit(Limit.Monthly(l.limit), l.since)))
        CurrentAndNextLimits(daily, weekly, monthly)
      }

      private def convert(limit: CurrentAndNextLimit[V, _]): JsonLimits =
        JsonLimits(convert(limit.current), limit.next.map(convert))

      private def convert(limit: EffectiveLimit[V, _]): JsonLimit =
        JsonLimit(limit.limit.value, limit.since)

      // Making these ones final makes the compiler unhappy.
      private case class PeriodLimits(daily: JsonLimits, weekly: JsonLimits, monthly: JsonLimits)
      private case class JsonLimits(current: JsonLimit, next: Option[JsonLimit])
      private case class JsonLimit(limit: Option[V], since: OffsetDateTime)
    }

  implicit val currentAndNextLimitsCodecForStakeLimits: Codec[CurrentAndNextLimits[StakeLimitAmount]] =
    currentAndNextLimitsCodec[StakeLimitAmount]
  implicit val currentAndNextLimitsCodecForDepositLimits: Codec[CurrentAndNextLimits[DepositLimitAmount]] =
    currentAndNextLimitsCodec[DepositLimitAmount]
  implicit val currentAndNextLimitsCodecForSessionLimits: Codec[CurrentAndNextLimits[SessionDuration]] =
    currentAndNextLimitsCodec[SessionDuration]

  implicit val coolOffPeriodCodec: Codec[CoolOffPeriod] = deriveCodec
  implicit val coolOffCauseCodec: Codec[CoolOffCause] = enumCodec(CoolOffCause)
  implicit val coolOffStatusCodec: Codec[CoolOffStatus] = deriveCodec

  implicit val punterStatusEncoder: Encoder[PunterStatus] = Encoder.instance {
    case PunterStatus.Active       => Json.fromString("ACTIVE")
    case PunterStatus.SelfExcluded => Json.fromString("SELF_EXCLUDED")
    case PunterStatus.InCoolOff    => Json.fromString("COOLING_OFF")
    case s: PunterStatus.Suspended =>
      s.suspensionEntity match {
        case OperatorSuspend(_) => Json.fromString("SUSPENDED")
        case NegativeBalance(_) => Json.fromString("NEGATIVE_BALANCE")
        case _                  => Json.fromString("SUSPENDED")
      }
    case PunterStatus.Deleted    => Json.fromString("DELETED")
    case PunterStatus.Unverified => Json.fromString("UNVERIFIED")
  }

  private def richPunterStatusJson(obj: PunterStatus): Json =
    obj match {
      case PunterStatus.Active       => Json.obj("status" -> Json.fromString("ACTIVE"))
      case PunterStatus.SelfExcluded => Json.obj("status" -> Json.fromString("SELF_EXCLUDED"))
      case PunterStatus.InCoolOff    => Json.obj("status" -> Json.fromString("COOLING_OFF"))
      case PunterStatus.Unverified   => Json.obj("status" -> Json.fromString("UNVERIFIED"))
      case PunterStatus.Suspended(suspensionEntity) =>
        Json.obj(
          "status" -> Json.fromString("SUSPENDED"),
          "reason" -> Json.fromString(suspensionEntity match {
            case OperatorSuspend(details)   => details
            case NegativeBalance(details)   => details
            case RegistrationIssue(details) => details
            case deceased: Deceased         => deceased.details
          }))
      case PunterStatus.Deleted => Json.obj("status" -> Json.fromString("DELETED"))
    }
  private def enrichPunterStatusEncoder[A](encoder: Encoder[A], status: A => PunterStatus): Encoder[A] =
    Encoder.instance[A] { (obj: A) =>
      val raw = encoder(obj)
      if (raw.isObject) {
        raw.mapObject(_.add("richStatus", richPunterStatusJson(status(obj))))
      } else {
        throw new RuntimeException(s"Expected the given format to produce a Json Object so that it can be enriched")
      }
    }

  implicit val suspensionEntityEncoder: Encoder[SuspensionEntity] = Encoder.instance {
    case OperatorSuspend(details) =>
      Json.obj("type" -> Json.fromString("OPERATOR_SUSPEND"), "details" -> Json.fromString(details))
    case NegativeBalance(details) =>
      Json.obj("type" -> Json.fromString("NEGATIVE_BALANCE"), "details" -> Json.fromString(details))
    case RegistrationIssue(details) =>
      Json.obj("type" -> Json.fromString("REGISTRATION_ISSUE"), "details" -> Json.fromString(details))
    case deceased: Deceased =>
      Json.obj("type" -> Json.fromString("REGISTRATION_ISSUE"), "details" -> Json.fromString(deceased.details))
  }

  implicit val punterSummaryCodec: Codec[PunterSummary] = deriveCodec[PunterSummary].dropNullValues

  implicit val beginCoolOffRequestCodec: Codec[BeginCoolOffRequest] = deriveCodec
  implicit val beginCoolOffResponseCodec: Codec[PunterCoolOffBegan] = deriveCodec

  implicit val selfExclusionDurationCodec: Codec[SelfExclusionDuration] = enumCodec(SelfExclusionDuration)

  implicit val selfExcludeRequestCodec: Codec[SelfExcludeRequest] = deriveCodec

  implicit val responsibleGamblingLimitTypeCodec: Codec[ResponsibleGamblingLimitType] = enumCodec(
    ResponsibleGamblingLimitType)
  implicit val limitPeriodTypeCodec: Codec[LimitPeriodType] = enumCodec(LimitPeriodType)
  implicit val limitsHistoryCodec: Codec[LimitChange] = deriveCodec[LimitChange].dropNullValues

  implicit val punterCoolOffEntryCodec: Codec[PunterCoolOffEntry] = deriveCodec

  implicit val suspendPunterRequestDecoder: Decoder[SuspendPunterRequest] = Decoder.instance((c: HCursor) =>
    for {
      entity <- c.downField("entity").as[String]
      details <- c.downField("details").as[String]
      result <- entity match {
        case "OPERATOR_SUSPEND" => Right(SuspendPunterRequest(OperatorSuspend(details)))
        case "NEGATIVE_BALANCE" => Right(SuspendPunterRequest(NegativeBalance(details)))
        case _                  => c.fail(s"""Couldn't decode ${SuspendPunterRequest.simpleObjectName}""")
      }
    } yield result)
  implicit val signInTimestampCodec: Codec[SignInTimestamp] =
    Codec[OffsetDateTime].bimap(_.value, SignInTimestamp.apply)

  implicit val titleCodec: Codec[Title] = Codec[String].bimapValidated(_.value, Title.apply)
  implicit val firstNameCodec: Codec[FirstName] = Codec[String].bimapValidated(_.value, FirstName.apply)
  implicit val lastNameCodec: Codec[LastName] = Codec[String].bimapValidated(_.value, LastName.apply)
  implicit val personalNameCodec: Codec[PersonalName] = deriveCodec
  implicit val addressCodec: Codec[Address] = deriveCodec
  implicit val first5DigitsOfSSNCodec: Codec[First5DigitsOfSSN] =
    Codec[String].bimapValidated[First5DigitsOfSSN](_.value, First5DigitsOfSSN.fromString)

  implicit val dateOfBirthCodec: Codec[DateOfBirth] = Codec.from(
    Decoder.instance((c: HCursor) =>
      (for {
        day <- c.downField("day").as[Int]
        month <- c.downField("month").as[Int]
        year <- c.downField("year").as[Int]
      } yield DateOfBirth.from(day, month, year)).flatMap(_.leftMap(errors =>
        c.failure(ValidationException.combineErrors(errors).message)).toEither)),
    deriveEncoder)
  implicit val genderCodec: Codec[Gender] = Codec[String].bimapValidated(_.entryName, Gender.fromString)
  implicit val communicationPreferencesCodec: Codec[CommunicationPreferences] = deriveCodec
  implicit val bettingPreferencesCodec: Codec[BettingPreferences] = deriveCodec
  implicit val termsAgreementCodec: Codec[TermsAgreement] = deriveCodec

  implicit val userProfileEncoder: Encoder[UserProfile] = enrichPunterStatusEncoder(deriveEncoder, _.status)
  implicit val punterProfileForPunterPresentationEncoder: Encoder[PunterProfileForPunterPresentation] =
    enrichPunterStatusEncoder(deriveEncoder[PunterProfileForPunterPresentation].dropNullValues, _.status)

  implicit val userTokenResponseCodec: Codec[UserTokenResponse] = deriveCodec

  implicit val loginRequestCodec: Codec[LoginRequest] = deriveCodec

  implicit val getSessionTimerResponseCodec: Codec[GetSessionTimerResponse] = deriveCodec

  implicit val loggedInCodec: Codec[LoggedIn] = deriveCodec

  implicit val loginResponseCodec: Codec[LoginResponse] = new Codec[LoginResponse] {
    private implicit val verificationRequestedResponseCodec: Codec[VerificationRequestedResponse] = deriveCodec

    private val loggedInConstant = "LOGGED_IN"
    private val verificationRequestedConstant = "VERIFICATION_REQUESTED"
    private val typeConstant = "type"

    override def apply(response: LoginResponse): Json =
      response match {
        case loggedInResponse: LoggedInResponse =>
          Codec[LoggedIn]
            .apply(loggedInResponse.loggedIn)
            .mapObject(_.add(typeConstant, Json.fromString(loggedInConstant)))
        case verificationRequested: VerificationRequestedResponse =>
          Codec[VerificationRequestedResponse]
            .apply(verificationRequested)
            .mapObject(_.add(typeConstant, Json.fromString(verificationRequestedConstant)))
      }

    override def apply(c: HCursor): Decoder.Result[LoginResponse] =
      c.downField(typeConstant).as[String].flatMap {
        case `loggedInConstant`              => c.as[LoggedIn].map(LoggedInResponse)
        case `verificationRequestedConstant` => c.as[VerificationRequestedResponse]
        case _                               => c.fail(s"Cannot match type '$typeConstant'")
      }
  }

  implicit val userPreferencesCodec: Codec[UserPreferences] = deriveCodec

  implicit val loginWithVerificationRequestCodec: Codec[LoginWithVerificationRequest] = deriveCodec

  implicit val signUpVerificationCodec: Codec[SignUpVerification] = deriveCodec
  implicit val signUpRequestCodec: Codec[SignUpRequest] = deriveCodec
  implicit val createBackofficeUserRequestCodec: Codec[CreateBackofficeUserRequest] = deriveCodec
  implicit val updatePunterDobRequestCodec: Codec[UpdatePunterDobRequest] = deriveCodec
  implicit val updatePunterAddressRequestCodec: Codec[UpdatePunterAddressRequest] = deriveCodec
  implicit val updatePunterPersonalNameRequestCodec: Codec[UpdatePunterPersonalNameRequest] = deriveCodec
  implicit val testSignUpRequestCodec: Codec[TestAccountSignUpRequest] = deriveCodec

  implicit val forgotPasswordRequestCodec: Codec[ForgotPasswordRequest] = deriveCodec

  implicit val resetPasswordRequestCodec: Codec[ResetPasswordRequest] = deriveCodec

  implicit val changePasswordRequestCodec: Codec[ChangePasswordRequest] = deriveCodec

  implicit val requestVerificationResponseCodec: Codec[RequestVerificationResponse] = deriveCodec

  implicit val refreshTokenRequestCodec: Codec[RefreshTokenRequest] = deriveCodec
  implicit val refreshTokenResponseCodec: Codec[RefreshTokenResponse] = deriveCodec

  implicit val getTermsResponseCodec: Codec[GetTermsResponse] = deriveCodec

  implicit val acceptTermsRequestCodec: Codec[AcceptTermsRequest] = deriveCodec

  implicit val updatePunterDetailsRequestCodec: Codec[UpdatePunterDetailsRequest] = deriveCodec

  implicit val phoneVerificationRequestCodec: Codec[PhoneVerificationRequest] = deriveCodec

  implicit val sessionCodec: Codec[Session] = deriveCodec[Session].dropNullValues

  implicit val updateEmailRequestCodec: Codec[UpdateEmailRequest] = deriveCodec

  implicit val updateMFAEnabledStatusRequestCodec: Codec[UpdateMFAEnabledStatusRequest] = deriveCodec

  implicit val rejectTransactionRequestFormat: Codec[RejectTransactionRequest] = deriveCodec
  implicit val updateSSNRequestFormat: Codec[UpdateSSNRequest] = deriveCodec
  implicit val updatePunterPhoneNumberRequestFormat: Codec[UpdatePunterPhoneNumberRequest] = deriveCodec
  implicit val punterSSNResponseFormat: Codec[PunterSSNResponse] = deriveCodec

  implicit val productExposureSummaryCodec: Codec[ProductExposureSummary] = deriveCodec
  implicit val predictionProductSummaryCodec: Codec[PredictionProductSummary] = deriveCodec
  implicit val financialSummaryProductBreakdownCodec: Codec[FinancialSummaryProductBreakdown] = deriveCodec
  implicit val financialSummaryResponseCodec: Codec[FinancialSummaryResponse] = deriveCodec
}
