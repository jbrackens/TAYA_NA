package phoenix.punters.infrastructure
import java.time.OffsetDateTime

import io.circe.Codec
import io.circe.Decoder
import io.circe.Encoder
import io.circe.HCursor
import io.circe.Json
import io.circe.generic.extras.semiauto.deriveUnwrappedCodec
import io.circe.generic.semiauto._
import org.virtuslab.ash.annotation.SerializabilityTrait
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.CirceAkkaSerializable
import phoenix.core.currency.MoneyAmount
import phoenix.core.serialization.CirceMigration.AddRequiredField
import phoenix.core.serialization.CirceMigration.ChangeOptionalToRequired
import phoenix.core.serialization.CirceMigration.jsonForEnum
import phoenix.core.serialization.CirceMigrations
import phoenix.core.serialization.PhoenixAkkaSerialization
import phoenix.core.serialization.PhoenixCodecs
import phoenix.core.serialization.deriveCodecWithMigrations
import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.punters.InvalidMFAAttemptCounter
import phoenix.punters.LoginFailureCount
import phoenix.punters.PunterEntity
import phoenix.punters.PunterProtocol
import phoenix.punters.PunterProtocol.Events.PunterVerified
import phoenix.punters.PunterState
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.CurrentAndNextLimit
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.EffectiveLimit
import phoenix.punters.domain.Limit
import phoenix.punters.domain.LimitPeriodType
import phoenix.punters.domain.LimitsLog
import phoenix.punters.domain.PunterSessions
import phoenix.punters.domain.PunterSessionsLog
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.SessionLimitation
import phoenix.punters.domain.SessionLimitation.Limited
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.domain.SuspensionEntity
import phoenix.punters.domain.SuspensionEntity.Deceased

@SerializabilityTrait
trait PuntersAkkaSerializable extends CirceAkkaSerializable

@Serializer(classOf[PuntersAkkaSerializable], Register.REGISTRATION_REGEX)
object PuntersAkkaSerialization extends PhoenixAkkaSerialization[PuntersAkkaSerializable] with PhoenixCodecs {
  import PuntersAkkaSerializationMigrations._

  private implicit def daylyCodec[T: Codec]: Codec[Limit[T, LimitPeriodType.Day.type]] = deriveCodec
  private implicit def weeklyCodec[T: Codec]: Codec[Limit[T, LimitPeriodType.Week.type]] = deriveCodec
  private implicit def monthlyCodec[T: Codec]: Codec[Limit[T, LimitPeriodType.Month.type]] = deriveCodec
  private implicit def effectiveDaylyCodec[T: Codec]: Codec[EffectiveLimit[T, LimitPeriodType.Day.type]] = deriveCodec
  private implicit def effectiveWeeklyCodec[T: Codec]: Codec[EffectiveLimit[T, LimitPeriodType.Week.type]] = deriveCodec
  private implicit def effectiveMonthlyCodec[T: Codec]: Codec[EffectiveLimit[T, LimitPeriodType.Month.type]] =
    deriveCodec
  private implicit def limitsLogCodec[T: Codec]: Codec[LimitsLog[T]] = deriveCodec
  private implicit def currentAndNextLimitDailyCodec[T: Codec]
      : Codec[CurrentAndNextLimit[T, LimitPeriodType.Day.type]] = deriveCodec
  private implicit def currentAndNextLimitWeeklyCodec[T: Codec]
      : Codec[CurrentAndNextLimit[T, LimitPeriodType.Week.type]] = deriveCodec
  private implicit def currentAndNextLimitMonthlyCodec[T: Codec]
      : Codec[CurrentAndNextLimit[T, LimitPeriodType.Month.type]] = deriveCodec
  private implicit def currentAndNextLimitsCodec[T: Codec]: Codec[CurrentAndNextLimits[T]] = deriveCodec

  private implicit lazy val moneyAmountCodec: Codec[MoneyAmount] = deriveCodec
  private implicit lazy val depositLimitAmountCodec: Codec[DepositLimitAmount] = deriveCodec
  private implicit lazy val stakeLimitAmountCodec: Codec[StakeLimitAmount] = deriveCodec
  private implicit lazy val referralCodeCodec: Codec[PunterProtocol.ReferralCode] = deriveCodec
  private implicit lazy val loginFailureCountCodec: Codec[LoginFailureCount] = deriveCodec
  private implicit lazy val invalidMFAAttemptCounterCodec: Codec[InvalidMFAAttemptCounter] = deriveCodec
  private implicit lazy val activationPathCodec: Codec[PunterState.ActivationPath] = deriveCodec
  private implicit lazy val punterProfileDataCodec: Codec[PunterState.PunterProfileData] = deriveCodec
  private implicit lazy val sessionDurationCodec: Codec[SessionDuration] = deriveCodec
  private implicit lazy val punterSessionsLogCodec: Codec[PunterSessionsLog] = deriveCodec
  private implicit lazy val punterSessionsCodec: Codec[PunterSessions] = deriveCodec

  private implicit lazy val notExistingPunterCodec: Codec[PunterState.NotExistingPunter.type] = deriveCodec
  private implicit lazy val coolOffCauseCodec: Codec[CoolOffCause] = deriveCodec
  private implicit lazy val coolOffPeriodCodec: Codec[PunterState.CoolOffPeriod] = deriveCodec
  private implicit lazy val coolOffInfoCodec: Codec[PunterState.CoolOffInfo] = deriveCodec
  private implicit lazy val selfExclusionDurationCodec: Codec[PunterState.SelfExclusionDuration] = deriveCodec
  private implicit lazy val selfExclusionOriginCodec: Codec[PunterState.SelfExclusionOrigin] = deriveCodec
  private implicit lazy val ipAddressCodec: Codec[IpAddress] = deriveCodec
  private implicit lazy val deviceCodec: Codec[Device] = deriveCodec
  private implicit lazy val deceasedCodec: Codec[Deceased] = deriveCodec
  private implicit lazy val suspensionEntityCodec: Codec[SuspensionEntity] = deriveCodec
  private implicit lazy val unlimitedSessionCodec: Codec[Unlimited] = deriveCodecWithMigrations
  private implicit lazy val limitedSessionCodec: Codec[Limited] = deriveCodecWithMigrations
  private implicit lazy val sessionLimitationCodec: Codec[SessionLimitation] = deriveCodec
  private implicit lazy val startedSessionCodec: Codec[PunterState.StartedSession] = deriveCodec
  private implicit lazy val endedSessionCodec: Codec[PunterState.EndedSession] = deriveCodec
  private implicit lazy val punterIdCodec: Codec[PunterEntity.PunterId] = deriveCodec
  private implicit lazy val adminIdCodec: Codec[PunterEntity.AdminId] = deriveUnwrappedCodec

  private implicit lazy val sessionIdCodec: Codec[PuntersBoundedContext.SessionId] = deriveCodec
  private implicit lazy val punterStateCodec: Codec[PunterState.PunterState] = deriveCodec
  implicit def punterCommandCodec: Codec[PunterProtocol.Commands.PunterCommand] = deriveCodec

  private implicit lazy val punterProfileCodec: Codec[PunterState.PunterProfile] = deriveCodec
  private implicit lazy val punterSuccessCodec: Codec[PunterProtocol.Responses.PunterSuccess] = deriveCodec
  private implicit lazy val punterFailureCodec: Codec[PunterProtocol.Responses.PunterFailure] = deriveCodec

  implicit lazy val punterResponseEncoder: Encoder[PunterProtocol.Responses.PunterResponse] = {
    case success: PunterProtocol.Responses.PunterSuccess => Json.obj("PunterSuccess" -> punterSuccessCodec(success))
    case failure: PunterProtocol.Responses.PunterFailure => Json.obj("PunterFailure" -> punterFailureCodec(failure))
  }

  implicit lazy val punterResponseDecoder: Decoder[PunterProtocol.Responses.PunterResponse] = (c: HCursor) => {
    val a = c.downField("PunterSuccess").as[PunterProtocol.Responses.PunterSuccess]
    val b = c.downField("PunterFailure").as[PunterProtocol.Responses.PunterFailure]
    a.orElse(b)
  }

  private implicit lazy val punterVerifiedCodec: Codec[PunterVerified] = deriveCodecWithMigrations
  private implicit lazy val punterEventCodec: Codec[PunterProtocol.Events.PunterEvent] = deriveCodec

  override def codecEntries: Seq[Registration[_ <: PuntersAkkaSerializable]] =
    List(
      Register[PunterState.PunterState],
      Register[PunterProtocol.Commands.PunterCommand],
      Register[PunterProtocol.Events.PunterEvent],
      Register[PunterProtocol.Responses.PunterResponse])
}

object PuntersAkkaSerializationMigrations {
  implicit val punterVerifiedMigration: CirceMigrations[PunterVerified] = CirceMigrations(
    ChangeOptionalToRequired("activationPath", jsonForEnum("Unknown")))

  implicit val unlimitedSessionMigration: CirceMigrations[Unlimited] = CirceMigrations(
    AddRequiredField("refreshTokenTimeout", Json.fromString(OffsetDateTime.MAX.toString)))

  implicit val limitedSessionMigration: CirceMigrations[Limited] = CirceMigrations(
    AddRequiredField("refreshTokenTimeout", Json.fromString(OffsetDateTime.MAX.toString)))
}
