package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.ErrorCode.{EventDataNotReady, EventNotSupported}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.EventStatus.{RaceOff, Resulted}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.{RequestMetadata, ResponseMetadata}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.{BaseResponse, EventStateResp, Participant}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state.SelectionState.{EMPTY_BETTING_ID, EMPTY_DISPLAY_ODDS, EMPTY_TRUE_ODDS}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state.{InGameEvent, ParticipantState, SelectionState}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.{BusinessErrorFactory, BusinessErrorSimulator}

trait EventUpdateOps {

  val MIN_SIZE = 4
  val MAX_SIZE = 20

  protected def buildEventUpdateResp(meta: RequestMetadata, gameEvent: InGameEvent): BaseResponse = withCompletedEvent(meta, gameEvent) {
    val state = gameEvent.event.get
    val metadata = ResponseMetadata.success(meta)
    val participants = state.participants
      .sortBy(_.position)
      .map(participantState => {
        gameEvent
          .obtainOdds(participantState.id)
          .map(buildExistingParticipant(participantState, _))
          .getOrElse(buildEmptyParticipant(participantState))
      })

    val eventStatus = meta match {
      case x if BusinessErrorSimulator.shouldSimulateErrorForContext(RaceOff.toString)(x) => RaceOff
      case x if BusinessErrorSimulator.shouldSimulateErrorForContext(Resulted.toString)(x) => Resulted
      case _ => state.status
    }

    EventStateResp(metadata, state.leagueName, state.startEventDate, eventStatus, participants)
  }

  private def buildExistingParticipant(participantState: ParticipantState, odds: SelectionState) = {
    Participant(odds.bettingId, participantState.position, odds.displayOdds, odds.trueOdds, odds.status)
  }

  private def buildEmptyParticipant(participantState: ParticipantState) = {
    Participant(EMPTY_BETTING_ID, participantState.position, EMPTY_DISPLAY_ODDS, EMPTY_TRUE_ODDS, SelectionStatus.Disabled)
  }

  protected def withCompletedEvent(meta: RequestMetadata, event: InGameEvent)(body: => BaseResponse): BaseResponse = {
    if (!event.allStatesPresents
      || BusinessErrorSimulator.shouldSimulateErrorForContext(EventDataNotReady.toString)(meta)) {
      return BusinessErrorFactory.notReadySubscribeError(meta,
        Seq("Event state not ready to accomplish request") ++ event.describe)
    }

    val eventState = event.event.get
    if (eventState.participants.length < MIN_SIZE
      || eventState.participants.length > MAX_SIZE
      || BusinessErrorSimulator.shouldSimulateErrorForContext(EventNotSupported.toString)(meta)) {
      return BusinessErrorFactory.notSupportedSubscribeError(meta,
        Seq(s"Events containing ${eventState.participants.length} participants are not supported"))
    }

    body
  }
}
