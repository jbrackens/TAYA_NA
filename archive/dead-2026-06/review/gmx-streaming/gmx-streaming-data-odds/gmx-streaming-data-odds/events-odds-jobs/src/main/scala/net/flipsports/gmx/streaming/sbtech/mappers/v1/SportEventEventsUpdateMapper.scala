package net.flipsports.gmx.streaming.sbtech.mappers.v1

import com.typesafe.scalalogging.LazyLogging
import gmx.dataapi.internal.siteextensions.SportEventUpdateType
import net.flipsports.gmx.streaming.sbtech.dictionaries.Sports
import net.flipsports.gmx.streaming.sbtech.mappers.v1.SportEventUpdateMapper._
import net.flipsports.gmx.streaming.sbtech.{SourceTypes, SportEventsTypes, _}
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import org.apache.flink.api.common.functions.MapFunction

import java.util.List
import scala.collection.JavaConverters._

class SportEventEventsUpdateMapper extends MapFunction[SourceTypes.Odds.Source, SportEventsTypes.SportEventUpdate.Source]
  with LazyLogging {

  override def map(source: SourceTypes.Odds.Source): SportEventsTypes.SportEventUpdate.Source = {
    if (source.event.isEmpty) {
      asNull(source.id.id,SportEventUpdateType.Event)
    } else {
        as (source.id.id, SportEventUpdateType.Event, source.eventTimestamp) {
          val event = source.event.get
          val result = new SportEventsTypes.SportEventEvent.ValueType()
          result.setCountryCode(event.getRegionCode)
          result.setCountryId(event.getRegionId)
          result.setCountryName(event.getRegionName)
          result.setEventName(event.getEventName)
          result.setEventType(event.getType)
          result.setId(event.getId)
          result.setIsDisabled(event.getIsSuspended)
          result.setIsLive(event.getIsLive)
          result.setLeagueId(event.getLeagueId)
          result.setLeagueName(event.getLeagueName)
          result.setParticipants(participants(event.getParticipants, event.getSportId))
          result.setSportId(event.getSportId)
          result.setSportName(event.getSportName)
          result.setStartTime(DateFormats.withAddedTimeAtUtc(event.getStartEventDate).toInstant.toEpochMilli)
          result.setStatus(event.getStatus)
          result
        }
    }
  }


  def participants(participants: List[SourceTypes.Event.Participant.ValueType], sportId: String): List[SportEventsTypes.SportEventEvent.Participant.ValueType] = participants.asScala.map { participant =>
    val result: SportEventsTypes.SportEventEvent.Participant.ValueType = new SportEventsTypes.SportEventEvent.Participant.ValueType
    result.setId(participant.getId)
    result.setName(participant.getName)
    result.setDetails(details(participant, sportId))
    result
  }.asJava

  def details(participant: SourceTypes.Event.Participant.ValueType, sportId: String): Any = {
    val sport = Sports.apply(sportId)

    val metadata = asMap(participant.getMetadata)
    val details = sport match {
      case Sports.HorseRacing => {
        val result = new SportEventsTypes.SportEventEvent.HorseRacingParticipantDetails.ValueType()
        result.setClothNumber(metadata.getOrDefault("runnerNumber", ""))
        result.setJockeyName(metadata.getOrDefault("jockey", ""))
        result.setJockeySilkURL(metadata.getOrDefault("iconUrl", ""))
        result.setRunnerStatus(metadata.getOrDefault("runnerStatus", ""))
        result.setStallNumber(metadata.getOrDefault("stallNumber", ""))
        result.setTrainerName(metadata.getOrDefault("trainer", ""))
        result
      }
      case Sports.Soccer => {
        val result = new SportEventsTypes.SportEventEvent.MatchParticipantDetails.ValueType()
        result.setVenueRole(participant.getVenueRole)
        result
      }
      case Sports.AmericanFootball => {
        val result = new SportEventsTypes.SportEventEvent.MatchParticipantDetails.ValueType()
        result.setVenueRole(participant.getVenueRole)
        result
      }
      case Sports.Competition => new SportEventsTypes.SportEventEvent.CompetitionParticipantDetails.ValueType()
    }
    details
  }
}


object SportEventEventsUpdateMapper {

  def apply(): MapFunction[SourceTypes.Odds.Source, SportEventsTypes.SportEventUpdate.Source] = new SportEventEventsUpdateMapper()

}