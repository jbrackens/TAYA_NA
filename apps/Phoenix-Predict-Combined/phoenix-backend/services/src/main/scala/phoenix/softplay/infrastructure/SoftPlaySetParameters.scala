package phoenix.softplay.infrastructure

import java.sql.Timestamp
import java.time.OffsetDateTime
import java.time.ZoneOffset

import slick.jdbc.PositionedParameters
import slick.jdbc.SetParameter

import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.domain.ResponsibleGamblingLimitType

object SoftPlaySetParameters {

  implicit val setRegistrationOutcome: SetParameter[RegistrationOutcome] = new SetParameter[RegistrationOutcome] {
    def apply(v: RegistrationOutcome, pp: PositionedParameters): Unit = { pp.setString(v.entryName) }
  }

  implicit val setOffsetDateTime: SetParameter[OffsetDateTime] = new SetParameter[OffsetDateTime] {
    def apply(v: OffsetDateTime, pp: PositionedParameters): Unit = {
      pp.setTimestamp(Timestamp.valueOf(v.atZoneSameInstant(ZoneOffset.UTC).toLocalDateTime()))
    }
  }

  implicit val setResponsibleGamblingLimitType: SetParameter[ResponsibleGamblingLimitType] =
    new SetParameter[ResponsibleGamblingLimitType] {
    def apply(v: ResponsibleGamblingLimitType, pp: PositionedParameters): Unit = { pp.setString(v.entryName) }
  }

  implicit val setCoolOffCause: SetParameter[CoolOffCause] = new SetParameter[CoolOffCause] {
    def apply(v: CoolOffCause, pp: PositionedParameters): Unit = { pp.setString(v.entryName) }
  }
}
