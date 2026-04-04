package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state

import akka.event.LoggingAdapter
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.{EventsUpdate, MarketUpdate, SelectionUpdate}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.validator.{EventUpdateValidator, SelectionUpdateValidator}

case class EventStorage(inGameEvent: InGameEvent, lastUpdate: Long)
  extends EventUpdateValidator
    with SelectionUpdateValidator {

  def copyWithEvents(message: EventsUpdate)(implicit logger: LoggingAdapter): EventStorage = {
    if (isDayOfEvent(message)
    && containsValidParticipants(message))
      copy(inGameEvent.copy(event = Some(EventState.asState(message))), Math.max(lastUpdate, message.lastUpdateDateTime))
    else
      this
  }

  def copyWithMarket(message: MarketUpdate): EventStorage = copy(inGameEvent.copy(market = Some(MarketState.asState(message))), Math.max(lastUpdate, message.lastUpdateDateTime))

  def copyWithSelection(message: SelectionUpdate)(implicit logger: LoggingAdapter): EventStorage = {
    val newSelection = SelectionState.asState(message)
    if (isActive(message)) {
      copy(overrideSelection(newSelection), Math.max(lastUpdate, message.lastUpdateDateTime))
    } else {
      val currentSelection = inGameEvent.selections.getOrElse(newSelection.participantId, newSelection)
      copy(overrideSelection(currentSelection.withStatus(message.status)), Math.max(lastUpdate, message.lastUpdateDateTime))
    }
  }

  private def overrideSelection(newSelection: SelectionState) = {
    inGameEvent.copy(selections = inGameEvent.selections + (newSelection.participantId -> newSelection))
  }

  def isReady: Boolean = inGameEvent.allStatesPresents
}


object EventStorage {
  def apply: EventStorage = EventStorage(inGameEvent = InGameEvent(None, None), lastUpdate = 0)
}
