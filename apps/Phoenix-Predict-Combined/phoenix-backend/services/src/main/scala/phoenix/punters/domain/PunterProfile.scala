package phoenix.punters.domain

import java.time.DayOfWeek.MONDAY
import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit

import scala.collection.immutable.IndexedSeq
import scala.concurrent.duration.Duration
import scala.concurrent.duration.DurationInt
import scala.concurrent.duration.FiniteDuration
import scala.math.Ordered.orderingToOrdered

import cats.Monoid
import cats.data.Validated
import cats.syntax.apply._
import cats.syntax.traverse._
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException
import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.SuspensionEntity.Deceased
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue

final case class PunterProfile(
    punterId: PunterId,
    depositLimits: CurrentAndNextLimits[DepositLimitAmount],
    stakeLimits: CurrentAndNextLimits[StakeLimitAmount],
    sessionLimits: CurrentAndNextLimits[SessionDuration],
    status: PunterStatus,
    exclusionStatus: Option[CoolOffStatus],
    isTestAccount: Boolean,
    endedSessions: List[EndedSession],
    maybeCurrentSession: Option[StartedSession],
    passwordResetRequired: Boolean,
    verifiedAt: Option[OffsetDateTime],
    activationPath: Option[ActivationPath] = Some(ActivationPath.Manual)) {

  def permissions: PunterPermissions =
    status match {
      case PunterStatus.Active =>
        PunterPermissions(canDeposit = true, canWithdraw = true)
      case PunterStatus.SelfExcluded | PunterStatus.InCoolOff =>
        PunterPermissions(canDeposit = false, canWithdraw = true)
      case PunterStatus.Suspended(OperatorSuspend(_))   => PunterPermissions(canDeposit = false, canWithdraw = false)
      case PunterStatus.Suspended(RegistrationIssue(_)) => PunterPermissions(canDeposit = false, canWithdraw = false)
      case PunterStatus.Suspended(Deceased(_, _, _))    => PunterPermissions(canDeposit = false, canWithdraw = false)
      case PunterStatus.Suspended(NegativeBalance(_))   => PunterPermissions(canDeposit = true, canWithdraw = false)
      case PunterStatus.Deleted                         => PunterPermissions(canDeposit = false, canWithdraw = false)
      case PunterStatus.Unverified                      => PunterPermissions(canDeposit = false, canWithdraw = false)
    }
}
final case class PunterPermissions(canDeposit: Boolean, canWithdraw: Boolean)

sealed trait PunterStatus
object PunterStatus {
  case object Active extends PunterStatus
  final case class Suspended(suspensionEntity: SuspensionEntity) extends PunterStatus
  case object InCoolOff extends PunterStatus
  case object SelfExcluded extends PunterStatus
  case object Deleted extends PunterStatus
  case object Unverified extends PunterStatus
}

sealed trait SuspensionEntity extends Product with Serializable {
  val details: String
}
object SuspensionEntity {
  final case class OperatorSuspend(details: String) extends SuspensionEntity
  final case class NegativeBalance(details: String) extends SuspensionEntity
  final case class RegistrationIssue(details: String) extends SuspensionEntity
  final case class Deceased(ipAddress: Option[IpAddress], device: Option[Device], details: String)
      extends SuspensionEntity

  object RegistrationIssue {
    val DuplicatedSSN: RegistrationIssue = RegistrationIssue("Duplicated SSN")
    val ExcludedFromGambling: RegistrationIssue = RegistrationIssue("Punter is excluded from gambling")
    val KBAInitialProcessFailed: RegistrationIssue = RegistrationIssue("KBA initial process failed")
    val IDPVRequestFailed: RegistrationIssue = RegistrationIssue("IDPV request failed")
    val RegistrationDataMismatch: RegistrationIssue = RegistrationIssue("Registration Data Mismatch")
    val UserIsSelfExcluded: RegistrationIssue = RegistrationIssue("User is Self-Excluded")
  }
}

final case class CoolOffPeriod(startTime: OffsetDateTime, endTime: OffsetDateTime)
final case class CoolOffStatus(period: CoolOffPeriod, cause: CoolOffCause)
final case class EndedSession(sessionId: SessionId, startedAt: OffsetDateTime, endedAt: OffsetDateTime)
final case class StartedSession(sessionId: SessionId, startedAt: OffsetDateTime, ipAddress: Option[IpAddress])

sealed trait CoolOffCause extends EnumEntry with UpperSnakecase
object CoolOffCause extends Enum[CoolOffCause] {

  override def values: IndexedSeq[CoolOffCause] = findValues

  final case object SelfInitiated extends CoolOffCause
  final case object SessionLimitBreach extends CoolOffCause
}

final case class CurrentAndNextLimits[V](
    daily: CurrentAndNextLimit[V, Day.type],
    weekly: CurrentAndNextLimit[V, Week.type],
    monthly: CurrentAndNextLimit[V, Month.type])

final case class CurrentAndNextLimit[V, +LT <: LimitPeriodType](
    current: EffectiveLimit[V, LT],
    next: Option[EffectiveLimit[V, LT]])

final case class EffectiveLimit[V, +LT <: LimitPeriodType](limit: Limit[V, LT], since: OffsetDateTime)

final case class EffectiveLimits[V](
    daily: EffectiveLimit[V, Day.type],
    weekly: EffectiveLimit[V, Week.type],
    monthly: EffectiveLimit[V, Month.type])

final case class Limits[V] private (
    daily: Limit[V, Day.type],
    weekly: Limit[V, Week.type],
    monthly: Limit[V, Month.type]) {

  def copy(
      daily: Limit[V, Day.type] = this.daily,
      weekly: Limit[V, Week.type] = this.weekly,
      monthly: Limit[V, Month.type] = this.monthly): Limits[V] = {
    new Limits(daily, weekly, monthly)
  }
}

object Limits {

  private val validationException = ValidationException(
    "Invalid limits value, (daily <= weekly <= monthly) constraint violated")

  def none[V: Ordering]: Limits[V] =
    unsafe(Limit.Daily(value = None), Limit.Weekly(value = None), Limit.Monthly(value = None))

  def validated[V: Ordering](
      daily: Limit[V, Day.type],
      weekly: Limit[V, Week.type],
      monthly: Limit[V, Month.type]): Validation[Limits[V]] = {
    Validated.condNel(
      lessOrEqual(daily.value, weekly.value) && lessOrEqual(weekly.value, monthly.value) && lessOrEqual(
        daily.value,
        monthly.value),
      new Limits(daily, weekly, monthly),
      validationException)
  }

  private def lessOrEqual[V: Ordering](first: Option[V], second: Option[V]): Boolean =
    (first, second).mapN { case (first, second) => first <= second }.getOrElse(true)

  def validateFromRawValues[A, V: Ordering](
      construct: A => Validation[V])(daily: Option[A], weekly: Option[A], monthly: Option[A]): Validation[Limits[V]] = {
    val dailyLimit = daily.traverse(construct)
    val weeklyLimit = weekly.traverse(construct)
    val monthlyLimit = monthly.traverse(construct)

    (dailyLimit, weeklyLimit, monthlyLimit).tupled.andThen {
      case (daily, weekly, monthly) =>
        validated(Limit.Daily(daily), Limit.Weekly(weekly), Limit.Monthly(monthly))
    }
  }

  def validatedWithCustomValidationPerLimitType[A, V: Ordering](construct: A => Validation[V])(
      dayValidation: Option[V] => Validation[Limit[V, Day.type]],
      weekValidation: Option[V] => Validation[Limit[V, Week.type]],
      monthValidation: Option[V] => Validation[Limit[V, Month.type]])(
      daily: Option[A],
      weekly: Option[A],
      monthly: Option[A]): Validation[Limits[V]] = {
    val dailyLimit = daily.traverse(construct)
    val weeklyLimit = weekly.traverse(construct)
    val monthlyLimit = monthly.traverse(construct)

    (dailyLimit, weeklyLimit, monthlyLimit).tupled
      .andThen {
        case (daily, weekly, monthly) =>
          (dayValidation(daily), weekValidation(weekly), monthValidation(monthly)).tupled
      }
      .andThen {
        case (validatedDaily, validatedWeekly, validatedMonthly) =>
          validated(validatedDaily, validatedWeekly, validatedMonthly)
      }
  }

  def unsafe[V: Ordering](
      daily: Limit[V, Day.type],
      weekly: Limit[V, Week.type],
      monthly: Limit[V, Month.type]): Limits[V] =
    validated(daily, weekly, monthly).getOrElse(throw validationException)

  def make[V](daily: Limit[V, Day.type], weekly: Limit[V, Week.type], monthly: Limit[V, Month.type]): Limits[V] =
    new Limits(daily, weekly, monthly)
}

trait ValueFormatter[T] {
  def format(v: T): String
}

sealed trait Limit[V, +LT <: LimitPeriodType] {
  val value: Option[V]

  final def isUnlimited: Boolean =
    value.isEmpty

  final def formatForDisplay(implicit valueFormatter: ValueFormatter[V]): String =
    value match {
      case Some(v) => valueFormatter.format(v)
      case None    => "REMOVED"
    }
}
object Limit {
  final case class Daily[V](value: Option[V]) extends Limit[V, Day.type]
  final case class Weekly[V](value: Option[V]) extends Limit[V, Week.type]
  final case class Monthly[V](value: Option[V]) extends Limit[V, Month.type]

  implicit def ordering[V: Monoid: Ordering, LT <: LimitPeriodType]: Ordering[Limit[V, LT]] =
    Ordering.by(_.value.getOrElse(Monoid[V].empty))

  type ValueFormatter[V] = V => String
}

final case class StakeLimitAmount(value: MoneyAmount)
object StakeLimitAmount {
  implicit val monoid: Monoid[StakeLimitAmount] = new Monoid[StakeLimitAmount] {
    override def empty: StakeLimitAmount = new StakeLimitAmount(MoneyAmount.zero.get)
    override def combine(x: StakeLimitAmount, y: StakeLimitAmount): StakeLimitAmount =
      new StakeLimitAmount(x.value + y.value)
  }

  implicit val ordering: Ordering[StakeLimitAmount] = Ordering.by(_.value)

  def fromMoneyAmount(value: MoneyAmount): Validation[StakeLimitAmount] =
    Validated.condNel(
      value.amount >= 0,
      new StakeLimitAmount(value),
      ValidationException("A stake limit amount must be >= 0"))

  implicit val valueFormatter: ValueFormatter[StakeLimitAmount] =
    (v: StakeLimitAmount) => DefaultCurrencyMoney.formatMoneyAmount(v.value)
}

final case class DepositLimitAmount(value: MoneyAmount)
object DepositLimitAmount {
  implicit val monoid: Monoid[DepositLimitAmount] = new Monoid[DepositLimitAmount] {
    override def empty: DepositLimitAmount = new DepositLimitAmount(MoneyAmount.zero.get)
    override def combine(x: DepositLimitAmount, y: DepositLimitAmount): DepositLimitAmount =
      new DepositLimitAmount(x.value + y.value)
  }

  implicit val ordering: Ordering[DepositLimitAmount] = Ordering.by(_.value)

  def fromMoneyAmount(value: MoneyAmount): Validation[DepositLimitAmount] =
    Validated.condNel(
      value.amount >= 0,
      new DepositLimitAmount(value),
      ValidationException("A deposit limit amount must be >= 0"))

  implicit val valueFormatter: ValueFormatter[DepositLimitAmount] =
    (v: DepositLimitAmount) => DefaultCurrencyMoney.formatMoneyAmount(v.value)
}

object SessionLimits {
  object Daily {
    private val maxDuration = SessionDuration(24.hours)

    def apply(maybeDuration: Option[SessionDuration]): Validation[Limit[SessionDuration, Day.type]] =
      Validated.condNel(
        maybeDuration.forall(duration => duration > SessionDuration.monoid.empty && duration <= maxDuration),
        Limit.Daily(maybeDuration),
        ValidationException(s"Daily session limit must be within (0, 24h]"))
  }

  object Weekly {
    private val maxDuration = SessionDuration(7.days)

    def apply(maybeDuration: Option[SessionDuration]): Validation[Limit[SessionDuration, Week.type]] =
      Validated.condNel(
        maybeDuration.forall(duration => duration > SessionDuration.monoid.empty && duration <= maxDuration),
        Limit.Weekly(maybeDuration),
        ValidationException(s"Weekly session limit must be within (0, 7d]"))
  }

  object Monthly {
    private val maxDuration = SessionDuration(31.days)

    def apply(maybeDuration: Option[SessionDuration]): Validation[Limit[SessionDuration, Month.type]] =
      Validated.condNel(
        maybeDuration.forall(duration => duration > SessionDuration.monoid.empty && duration <= maxDuration),
        Limit.Monthly(maybeDuration),
        ValidationException(s"Monthly session limit must be within (0, 31d]"))
  }
}

final case class SessionDuration(nanos: Long) {
  def +(other: SessionDuration): SessionDuration = copy(nanos + other.nanos)
  def -(other: SessionDuration): SessionDuration = copy(nanos - other.nanos)

}
object SessionDuration {
  def apply(duration: FiniteDuration): SessionDuration =
    new SessionDuration(duration.toNanos)

  implicit val monoid: Monoid[SessionDuration] = new Monoid[SessionDuration] {
    override def empty: SessionDuration = SessionDuration(Duration.Zero)
    override def combine(x: SessionDuration, y: SessionDuration): SessionDuration = x + y
  }

  implicit val ordering: Ordering[SessionDuration] = Ordering.by(_.nanos)

  def from(start: OffsetDateTime, end: OffsetDateTime): SessionDuration =
    SessionDuration(FiniteDuration(end.toInstant.toEpochMilli - start.toInstant.toEpochMilli, TimeUnit.MILLISECONDS))

  def min(first: SessionDuration, rest: SessionDuration*): SessionDuration =
    (rest :+ first).min

  def max(first: SessionDuration, rest: SessionDuration*): SessionDuration =
    (rest :+ first).max

  implicit class OffsetDateTimeDurationExtensionOps(self: OffsetDateTime) {
    def -(duration: SessionDuration): OffsetDateTime = self.minusNanos(duration.nanos)
    def +(duration: SessionDuration): OffsetDateTime = self.plusNanos(duration.nanos)
  }

  implicit val valueFormatter: ValueFormatter[SessionDuration] =
    (v: SessionDuration) => Duration.fromNanos(v.nanos).toString()
}

sealed trait LimitPeriodType extends EnumEntry with UpperSnakecase
object LimitPeriodType extends Enum[LimitPeriodType] {
  override def values: IndexedSeq[LimitPeriodType] = findValues

  case object Day extends LimitPeriodType
  case object Week extends LimitPeriodType
  case object Month extends LimitPeriodType

}

sealed trait LimitPeriod[+LT <: LimitPeriodType] {
  val startInclusive: OffsetDateTime
  val endExclusive: OffsetDateTime

  def next: LimitPeriod[LT]
}
object LimitPeriod {
  private final case class DayPeriod(startInclusive: OffsetDateTime) extends LimitPeriod[Day.type] {
    override val endExclusive: OffsetDateTime = startInclusive.plusDays(1)
    override def next: LimitPeriod[Day.type] = DayPeriod(endExclusive)
  }

  private final case class WeekPeriod(startInclusive: OffsetDateTime) extends LimitPeriod[Week.type] {
    override val endExclusive: OffsetDateTime = startInclusive.plusWeeks(1)
    override def next: LimitPeriod[Week.type] = WeekPeriod(endExclusive)
  }

  private final case class MonthPeriod(startInclusive: OffsetDateTime) extends LimitPeriod[Month.type] {
    override val endExclusive: OffsetDateTime = startInclusive.plusMonths(1)
    override def next: LimitPeriod[Month.type] = MonthPeriod(endExclusive)
  }

  def enclosingDay(time: OffsetDateTime, clock: Clock): LimitPeriod[Day.type] = {
    val startOfDayInclusive = clock.adjustToClockZone(time).truncatedTo(ChronoUnit.DAYS)
    DayPeriod(startOfDayInclusive)
  }

  def enclosingWeek(time: OffsetDateTime, clock: Clock): LimitPeriod[Week.type] = {
    val startOfWeekInclusive = clock.adjustToClockZone(time).`with`(MONDAY).truncatedTo(ChronoUnit.DAYS)
    WeekPeriod(startOfWeekInclusive)
  }

  def enclosingMonth(time: OffsetDateTime, clock: Clock): LimitPeriod[Month.type] = {
    val startOfMonthInclusive = clock.adjustToClockZone(time).withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS)
    MonthPeriod(startOfMonthInclusive)
  }
}
