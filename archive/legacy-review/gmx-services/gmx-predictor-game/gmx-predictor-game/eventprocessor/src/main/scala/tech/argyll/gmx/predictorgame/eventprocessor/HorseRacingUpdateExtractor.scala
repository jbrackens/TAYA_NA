package tech.argyll.gmx.predictorgame.eventprocessor

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import net.press.pa.delivery.betting._
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseStatus._
import tech.argyll.gmx.predictorgame.engine.racing._

import scala.collection.JavaConverters._

class HorseRacingUpdateExtractor extends DomainMapper {

  private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmxx")

  def prepareEventUpdate(meeting: Meeting, race: Race): HorseRacingEventUpdate = {
    HorseRacingEventUpdate(race.getId.toLong, meeting.getCourse, parseDateTime(race.getDate, race.getTime), mapEventStatus(race.getStatus))
  }

  def prepareParticipantUpdate(race: Race, horse: Horse): HorseRacingParticipantUpdate = {
    val result = horse.getPhotoFinishOrResultOrCasualty.asScala.headOption.map {
      case r: Result => (mapHorseStatus(horse.getStatus), Option(r.getAmendedPos).orElse(Some(r.getFinishPos)))
      case _: Casualty => (CASUALTY, None)
      case _ => (mapHorseStatus(horse.getStatus), None)
    }.getOrElse((mapHorseStatus(horse.getStatus), None))

    HorseRacingParticipantUpdate(race.getId.toLong, horse.getId.toLong, result._1, result._2.map(_.toInt))
  }

  def parseDateTime(date: String, time: String) = ZonedDateTime.parse(date + time, DATE_TIME_FORMATTER)
}
