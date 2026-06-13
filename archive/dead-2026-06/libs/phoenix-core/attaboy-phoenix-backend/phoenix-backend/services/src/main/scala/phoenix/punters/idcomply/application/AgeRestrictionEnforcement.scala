package phoenix.punters.idcomply.application

import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit

import phoenix.punters.domain.DateOfBirth

object AgeRestrictionEnforcement {
  val MinimumRequiredAge = 21

  def passesAgeRestrictionCheck(dateOfBirth: DateOfBirth, now: OffsetDateTime): Boolean = {
    val dateOfBirthAsOffsetDateTime =
      OffsetDateTime.of(dateOfBirth.year, dateOfBirth.month, dateOfBirth.day, 0, 0, 0, 0, now.getOffset)
    ChronoUnit.YEARS.between(dateOfBirthAsOffsetDateTime, now) >= MinimumRequiredAge
  }
}
