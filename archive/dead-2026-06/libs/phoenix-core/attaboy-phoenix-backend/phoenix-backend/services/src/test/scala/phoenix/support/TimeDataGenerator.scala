package phoenix.support

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.duration._

import phoenix.core.TimeUtils._
import phoenix.support.DataGenerator.randomNumber

object TimeDataGenerator {
  def between(start: OffsetDateTime, end: OffsetDateTime): OffsetDateTime =
    OffsetDateTime.ofInstant(
      Instant.ofEpochMilli(randomNumber(start.toInstant.toEpochMilli, end.toInstant.toEpochMilli)),
      start.getOffset)

  def before(reference: OffsetDateTime): OffsetDateTime =
    between(OffsetDateTime.ofInstant(Instant.EPOCH, reference.getOffset), reference - 1.millisecond)

  def after(reference: OffsetDateTime, maxDifference: FiniteDuration = 100.days): OffsetDateTime =
    between(reference + 1.millisecond, reference + maxDifference)

  def atSameDayAndBeforeAs(reference: OffsetDateTime): OffsetDateTime =
    between(reference.atBeginningOfDay(), reference)

  def atSameWeekAndBeforeAs(reference: OffsetDateTime): OffsetDateTime =
    between(reference.atBeginningOfWeek(), reference)

  def atSameMonthAndBeforeAs(reference: OffsetDateTime): OffsetDateTime =
    between(reference.atBeginningOfMonth(), reference)
}
