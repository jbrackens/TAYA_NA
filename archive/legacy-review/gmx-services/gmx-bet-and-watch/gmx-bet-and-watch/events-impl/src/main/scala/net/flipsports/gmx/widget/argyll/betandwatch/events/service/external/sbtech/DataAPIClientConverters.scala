package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.format.{DateTimeFormatter, DateTimeFormatterBuilder}
import java.time.temporal.ChronoField
import java.time.{LocalDateTime, ZoneId, ZonedDateTime}

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto._
import play.api.libs.functional.syntax.{unlift, _}
import play.api.libs.json.{Format, Reads, __}

object DataAPIClientConverters {

  private val timeFormat: DateTimeFormatter = new DateTimeFormatterBuilder().appendPattern("yyyy-MM-dd'T'HH:mm:ss")
    .appendFraction(ChronoField.MILLI_OF_SECOND, 0, 3, true)
    .toFormatter

  private def timestampFromDateString(timeStr: String): ZonedDateTime = {
    LocalDateTime.parse(timeStr, timeFormat).atZone(ZoneId.of("UTC"))
  }

  private val dateConverter = Format(
    implicitly[Reads[String]].map(x => timestampFromDateString(x)),
    (_: ZonedDateTime) => ??? //intentionally not implemented - we do not use Writer
  )

  implicit val playerDetailsConverter: Format[UserDetails] = (
    (__ \ "CustomerId").format[Long] and
      (__ \ "PlayerUserName").format[String] and
      (__ \ "FullName").format[String] and
      (__ \ "CountryCode").format[String]
    ) (UserDetails.apply, unlift(UserDetails.unapply))

  implicit val selectionConverter: Format[Selection] = (
    (__ \ "GameID").format[Long] and
      (__ \ "LineID").format[Long] and
      (__ \ "LineTypeName").format[String] and
      (__ \ "EventDate").format[ZonedDateTime](dateConverter) and
      (__ \ "Odds").format[Long]
    ) (Selection.apply, unlift(Selection.unapply))

  implicit val betConverter: Format[Bet] = (
    (__ \ "PurchaseID").format[String] and
      (__ \ "TotalStake").format[Double] and
      (__ \ "CustomerID").format[Long] and
      (__ \ "CreationDate").format[ZonedDateTime](dateConverter)
    ) (Bet.apply, unlift(Bet.unapply))

}
