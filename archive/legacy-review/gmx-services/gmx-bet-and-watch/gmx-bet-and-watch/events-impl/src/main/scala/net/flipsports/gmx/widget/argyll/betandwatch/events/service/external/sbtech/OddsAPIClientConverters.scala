package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.format.DateTimeFormatter
import java.time.{LocalDateTime, ZoneId, ZonedDateTime}

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto._
import play.api.libs.functional.syntax.{unlift, _}
import play.api.libs.json.{Format, Json, Reads, __}

object OddsAPIClientConverters {

  private val timeFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

  private def timestampFromDateString(timeStr: String): ZonedDateTime = {
    LocalDateTime.parse(timeStr, timeFormat).atZone(ZoneId.of("UTC"))
  }

  private val dateConverter = Format(
    implicitly[Reads[String]].map(x => timestampFromDateString(x)),
    (_: ZonedDateTime) => ??? //intentionally not implemented - we do not use Writer
  )

  implicit val countryConverter = Json.format[Country]

  implicit val leagueConverter: Format[League] = (
    (__ \ "LeagueID").format[Long] and
      (__ \ "LeagueName").format[String] and
      (__ \ "CountryID").format[Long]
    ) (League.apply, unlift(League.unapply))


  implicit val gameConverter: Format[Game] = (
    (__ \ "GameID").format[Long] and
      (__ \ "Home").format[String] and
      (__ \ "GameDate").format[ZonedDateTime](dateConverter)
    ) (Game.apply, unlift(Game.unapply))

}
