package gmx.widget.siteextentions.datafeed.test.shared

import java.time.Instant

import tech.argyll.video.domain.model.SportType

import gmx.common.scala.core.OptionUtils._
import gmx.dataapi.internal.siteextensions.event.EventStatusEnum
import gmx.dataapi.internal.siteextensions.event.ParticipantVenueRoleEnum
import gmx.dataapi.internal.siteextensions.event.ParticipantVenueRoleEnum.Away
import gmx.dataapi.internal.siteextensions.event.ParticipantVenueRoleEnum.Home
import gmx.dataapi.internal.siteextensions.selection.SelectionOddsTypeEnum
import gmx.widget.siteextentions.datafeed.service.Elements._

object SampleStateUpdateFactory {

  def sampleSoccerEventUpdate: EventUpdate = {
    EventUpdate(
      header = UpdateHeader(
        DataGenerator.generatePartnerType,
        DataGenerator.generateUUID,
        DataGenerator.generatePastInstant,
        DataGenerator.generatePastInstant),
      eventId = DataGenerator.generateId,
      sport = SportType.SOCCER,
      countryCode = DataGenerator.generateCountryCode,
      leagueId = DataGenerator.generateId.toInt,
      leagueName = DataGenerator.generateLeague,
      eventType = DataGenerator.generateEventType,
      eventName = DataGenerator.generateEventName,
      startTime = DataGenerator.generateFutureInstant,
      status = EventStatusEnum.NotStarted,
      isDisabled = false,
      isLive = false,
      participants = Seq(sampleSoccerParticipant(Home), sampleSoccerParticipant(Away)))
  }

  def sampleSoccerParticipant(venueRole: ParticipantVenueRoleEnum): ParticipantUpdate = {
    ParticipantUpdate(DataGenerator.generateId, DataGenerator.generateTeam, MatchParticipantDetailsUpdate(venueRole))
  }

  def sampleMarketUpdate(forEvent: EventUpdate): MarketUpdate = {
    MarketUpdate(
      header = UpdateHeader(
        forEvent.header.partner,
        DataGenerator.generateUUID,
        // TODO temporarily as now the ordering of dates is super important
//        DataGenerator.generatePastInstant,
        Instant.now(),
        DataGenerator.generatePastInstant),
      marketId = DataGenerator.generateId,
      eventId = forEvent.eventId,
      marketType = DataGenerator.generateSBTechMarketType.marketType,
      marketName = DataGenerator.generateMarketName,
      isDisabled = false)
  }

  def sampleSoccerSelectionUpdate(forMarket: MarketUpdate): SelectionUpdate = {
    val odds = DataGenerator.generateOdds
    SelectionUpdate(
      header = UpdateHeader(
        forMarket.header.partner,
        DataGenerator.generateUUID,
        DataGenerator.generatePastInstant,
        DataGenerator.generatePastInstant),
      selectionId = DataGenerator.generateId,
      eventId = forMarket.eventId,
      marketId = forMarket.marketId,
      selectionIntId = DataGenerator.generateId.toInt,
      selectionType = DataGenerator.generateSBTechSelectionType.selectionType,
      participantId = Option.when(DataGenerator.generateBool) { DataGenerator.generateId },
      selectionName = DataGenerator.generateSelectionName,
      isDisabled = false,
      trueOdds = odds(SelectionOddsTypeEnum.Decimal).toDouble,
      displayOdds = odds,
      details = CompetitionSelectionDetailsUpdate())
  }
}
