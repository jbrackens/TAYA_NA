package gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter

import scala.collection.JavaConverters._

import tech.argyll.video.domain.model.SportType

import gmx.dataapi.internal.siteextensions.SportEventUpdateKey
import gmx.dataapi.internal.siteextensions.event.Event
import gmx.dataapi.internal.siteextensions.event.EventTypeEnum
import gmx.dataapi.internal.siteextensions.event.HorseRacingParticipantDetails
import gmx.dataapi.internal.siteextensions.event.MatchParticipantDetails
import gmx.dataapi.internal.siteextensions.event.Participant
import gmx.widget.siteextentions.datafeed.service.Elements._
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DictionaryConverter._

object EventConverter {

  private val unsupportedEvents =
    List((SportType.SOCCER, EventTypeEnum.Outright), (SportType.FOOTBALL, EventTypeEnum.Outright))

  def mapDelete(key: SportEventUpdateKey, header: DeleteHeader): EventDelete =
    EventDelete(header, key.getId.toString)

  def mapUpdate(payload: Event, header: UpdateHeader): StateUpdate = {
    val sportType = mapSportType(payload.getSportId)
    val eventType = mapEventType(payload.getEventType)
    validateSupported(sportType, eventType)

    EventUpdate(
      header = header,
      eventId = payload.getId.toString,
      sport = sportType,
      countryCode = payload.getCountryCode.toString,
      leagueId = payload.getLeagueId.toString.toInt,
      leagueName = payload.getLeagueName.toString,
      eventType = eventType,
      eventName = payload.getEventName.toString,
      startTime = normalizeTimestamp(payload.getStartTime),
      status = mapEventStatus(payload.getStatus),
      isDisabled = payload.getIsDisabled,
      isLive = payload.getIsLive,
      participants = payload.getParticipants.asScala.map(mapParticipant(_, sportType)))
  }

  private def validateSupported(sportType: SportType, eventType: EventTypeEnum): Unit = {
    if (unsupportedEvents.contains((sportType, eventType)))
      throwConverterException(s"Not supported event: $eventType for sport: $sportType")
    else {
      ()
    }
  }

  private def mapParticipant(item: Participant, sport: SportType): ParticipantUpdate =
    ParticipantUpdate(
      id = item.getId.toString,
      name = item.getName.toString,
      details = mapParticipantDetails(item, sport))

  private def mapParticipantDetails(item: Participant, sportType: SportType): ParticipantDetailsUpdate =
    sportType match {
      case SportType.HORSE_RACING =>
        val details = item.getDetails.asInstanceOf[HorseRacingParticipantDetails]
        HorseRacingParticipantDetailsUpdate(
          runnerStatus = mapParticipantRunnerStatus(details.getRunnerStatus),
          clothNumber = details.getClothNumber.toString,
          stallNumber = details.getStallNumber.toString,
          jockeyName = details.getJockeyName.toString,
          trainerName = details.getTrainerName.toString,
          jockeySilkURL = details.getJockeySilkURL.toString)

      case SportType.SOCCER | SportType.FOOTBALL =>
        val details = item.getDetails.asInstanceOf[MatchParticipantDetails]
        MatchParticipantDetailsUpdate(mapParticipantVenueRole(details.getVenueRole))

      case _ => CompetitionParticipantDetailsUpdate()
    }
}
