package gmx.widget.siteextentions.datafeed.service

import java.time.Instant

import tech.argyll.video.domain.model.MarketType
import tech.argyll.video.domain.model.PartnerType
import tech.argyll.video.domain.model.SelectionType
import tech.argyll.video.domain.model.SportType

import gmx.common.scala.core.monitoring.Trackable
import gmx.dataapi.internal.siteextensions.event.EventStatusEnum
import gmx.dataapi.internal.siteextensions.event.EventTypeEnum
import gmx.dataapi.internal.siteextensions.event.ParticipantRunnerStatusEnum
import gmx.dataapi.internal.siteextensions.event.ParticipantVenueRoleEnum
import gmx.dataapi.internal.siteextensions.selection.SelectionOddsTypeEnum
import gmx.dataapi.internal.siteextensions.selection.SelectionRunnerStatusEnum
import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.MatchParticipantDetailsUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.ParticipantUpdate

object Elements {

  sealed trait StateUpdate {
    def logEntry: String
  }

  sealed trait ParticipantDetailsUpdate

  sealed trait SelectionDetailsUpdate

  case class UpdateHeader(partner: PartnerType, messageId: String, originDate: Instant, processingDate: Instant)
  case class DeleteHeader(partner: PartnerType)

  case class EventUpdate(
      header: UpdateHeader,
      eventId: String,
      sport: SportType,
      countryCode: String,
      leagueId: Int,
      leagueName: String,
      eventType: EventTypeEnum, //TODO do not use enums from data-api
      eventName: String,
      startTime: Instant,
      status: EventStatusEnum,
      isDisabled: Boolean,
      isLive: Boolean,
      participants: Seq[ParticipantUpdate] = Seq())
      extends StateUpdate
      with Trackable {
    override def extractUUID: String = header.messageId
    override def logEntry: String = s"[partner=${header.partner} eventId=$eventId]"
  }

  case class ParticipantUpdate(id: String, name: String, details: ParticipantDetailsUpdate)

  case class CompetitionParticipantDetailsUpdate() extends ParticipantDetailsUpdate
  case class MatchParticipantDetailsUpdate(venueRole: ParticipantVenueRoleEnum) extends ParticipantDetailsUpdate
  case class HorseRacingParticipantDetailsUpdate(
      runnerStatus: ParticipantRunnerStatusEnum,
      clothNumber: String,
      stallNumber: String,
      jockeyName: String,
      trainerName: String,
      jockeySilkURL: String)
      extends ParticipantDetailsUpdate

  case class EventDelete(header: DeleteHeader, eventId: String) extends StateUpdate {
    override def logEntry: String = s"[partner=${header.partner} eventId=$eventId]"
  }

  case class MarketUpdate(
      header: UpdateHeader,
      marketId: String,
      eventId: String,
      marketType: MarketType,
      marketName: String,
      isDisabled: Boolean)
      extends StateUpdate
      with Trackable {
    override def extractUUID: String = header.messageId
    override def logEntry: String = s"[partner=${header.partner} marketId=$marketId eventId=$eventId]"
  }
  case class MarketDelete(header: DeleteHeader, marketId: String) extends StateUpdate {
    override def logEntry: String = s"[partner=${header.partner} marketId=$marketId]"
  }

  case class SelectionUpdate(
      header: UpdateHeader,
      selectionId: String,
      eventId: String,
      marketId: String,
      selectionIntId: Int,
      selectionType: SelectionType,
      participantId: Option[String],
      selectionName: String,
      isDisabled: Boolean,
      trueOdds: Double,
      displayOdds: Map[SelectionOddsTypeEnum, String],
      details: SelectionDetailsUpdate)
      extends StateUpdate
      with Trackable {
    override def extractUUID: String = header.messageId
    override def logEntry: String =
      s"[partner=${header.partner} selectionId=$selectionId marketId=$marketId eventId=$eventId]"
  }

  case class CompetitionSelectionDetailsUpdate() extends SelectionDetailsUpdate
  case class HorseRacingSelectionDetailsUpdate(runnerStatus: SelectionRunnerStatusEnum) extends SelectionDetailsUpdate

  case class SelectionDelete(header: DeleteHeader, selectionId: String) extends StateUpdate {
    override def logEntry: String = s"[partner=${header.partner} selectionId=$selectionId]"
  }

}

object ElementsOps {
  implicit class SoccerEventUpdate(self: EventUpdate) {
    def findParticipant(venueRole: ParticipantVenueRoleEnum): Option[ParticipantUpdate] =
      self.participants.find(_.details.asInstanceOf[MatchParticipantDetailsUpdate].venueRole == venueRole)
  }
}
