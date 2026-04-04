package tech.argyll.gmx.predictorgame

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import play.api.libs.json.Reads.DefaultZonedDateTimeReads
import play.api.libs.json.Writes.temporalWrites
import play.api.libs.json.{Format, Reads, Writes}
import tech.argyll.gmx.predictorgame.services.prediction.{Evaluation, PrizeQualification, RoundStatus}

package object controllers {

  object ImplicitConverters {

    implicit val DefaultZonedDateTimeWrites: Writes[ZonedDateTime] =
      temporalWrites[ZonedDateTime, DateTimeFormatter](
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mmxxx")
      )

    implicit val DefaultZonedDateTimeFormat: Format[ZonedDateTime] =
      Format(DefaultZonedDateTimeReads, DefaultZonedDateTimeWrites)

    implicit val prizeQualificationConverter: Format[PrizeQualification.PrizeQualification] =
      Format(Reads.enumNameReads(PrizeQualification), Writes.enumNameWrites)
    implicit val evaluationConverter: Format[Evaluation.Evaluation] =
      Format(Reads.enumNameReads(Evaluation), Writes.enumNameWrites)
    implicit val roundStatusConverter: Format[RoundStatus.RoundStatus] =
      Format(Reads.enumNameReads(RoundStatus), Writes.enumNameWrites)
  }

}