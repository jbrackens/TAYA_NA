package phoenix.support

import cats.data.NonEmptyList

import phoenix.core.currency.MoneyAmount
import phoenix.core.validation.ValidationException
import phoenix.punters.domain.Email
import phoenix.punters.domain.Limit
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.Limits
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.SessionLimits
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.domain.Username
import phoenix.punters.domain.ValidPassword

object UnsafeValueObjectExtensions {

  implicit class UnsafeEmailOps(self: Email.type) {
    def fromStringUnsafe(value: String): Email =
      Email
        .fromString(value)
        .fold(e => throw new IllegalArgumentException(s"Invalid email $value, error: ${combinedMessage(e)}"), identity)
  }

  implicit class UnsafeUsernameOps(self: Username.type) {
    def fromStringUnsafe(value: String): Username =
      Username(value).fold(
        e => throw new IllegalArgumentException(s"Invalid username $value, error: ${combinedMessage(e)}"),
        identity)
  }

  implicit class UnsafeValidPasswordOps(self: ValidPassword.type) {
    def fromStringUnsafe(value: String): ValidPassword =
      ValidPassword
        .fromString(value)
        .fold(
          e => throw new IllegalArgumentException(s"Invalid password $value, error: ${combinedMessage(e)}"),
          identity)
  }

  implicit class UnsafeDailySessionLimitOps(self: SessionLimits.Daily.type) {
    def unsafe(value: SessionDuration): Limit[SessionDuration, Day.type] = unsafe(Some(value))

    def unsafe(value: Option[SessionDuration]): Limit[SessionDuration, Day.type] =
      self(value).fold(
        e => throw new IllegalArgumentException(s"Invalid Day period $value, error: ${combinedMessage(e)}"),
        identity)
  }

  implicit class UnsafeWeeklySessionLimitOps(self: SessionLimits.Weekly.type) {
    def unsafe(value: SessionDuration): Limit[SessionDuration, Week.type] = unsafe(Some(value))

    def unsafe(value: Option[SessionDuration]): Limit[SessionDuration, Week.type] =
      self(value).fold(
        e => throw new IllegalArgumentException(s"Invalid Week period $value, error: ${combinedMessage(e)}"),
        identity)
  }

  implicit class UnsafeMonthlySessionLimitOps(self: SessionLimits.Monthly.type) {
    def unsafe(value: SessionDuration): Limit[SessionDuration, Month.type] = unsafe(Some(value))

    def unsafe(value: Option[SessionDuration]): Limit[SessionDuration, Month.type] =
      self(value).fold(
        e => throw new IllegalArgumentException(s"Invalid Month period $value, error: ${combinedMessage(e)}"),
        identity)
  }

  implicit class UnsafeLimitsOps(self: Limits.type) {
    def unsafe[V: Ordering](
        daily: Limit[V, Day.type],
        weekly: Limit[V, Week.type],
        monthly: Limit[V, Month.type]): Limits[V] =
      Limits
        .validated(daily, weekly, monthly)
        .fold(
          e =>
            throw new IllegalArgumentException(
              s"Invalid limits $daily, $weekly, $monthly, error: ${combinedMessage(e)}"),
          identity)
  }

  implicit class UnsafeStakeLimitAmountOps(self: StakeLimitAmount.type) {
    def unsafe(moneyAmount: MoneyAmount): StakeLimitAmount =
      StakeLimitAmount
        .fromMoneyAmount(moneyAmount)
        .fold(e => throw new IllegalArgumentException(s"Invalid stake limit amount: $moneyAmount, error: $e"), identity)
  }

  implicit class UnsafeValidationOps[T](self: phoenix.core.validation.Validation.Validation[T]) {
    def unsafe(): T =
      self.fold(
        e => throw new IllegalArgumentException(s"Invalid validation of $self, error: ${combinedMessage(e)}"),
        identity)
  }

  private def combinedMessage(errors: NonEmptyList[ValidationException]): String = errors.toList.mkString(",")
}
