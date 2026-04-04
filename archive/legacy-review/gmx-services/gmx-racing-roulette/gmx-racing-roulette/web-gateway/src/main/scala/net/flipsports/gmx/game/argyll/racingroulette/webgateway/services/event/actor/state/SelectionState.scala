package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus.Disabled
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.SelectionUpdate
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state.SelectionState.parseStatus


case class SelectionState(bettingId: String,
                          participantId: String,
                          marketId: String,
                          status: SelectionStatus,
                          eventId: String,
                          trueOdds: Double,
                          displayOdds: String,
                          sbtechUpdateTime: Long,
                          flinkProcessedTime: Long) {

  def withStatus(input: String): SelectionState = {
    copy(status = parseStatus(input))
  }
}


object SelectionState {
  val ODDS_TO_DISPLAY = "Fractional"
  val EMPTY_BETTING_ID = "N/A"
  val EMPTY_DISPLAY_ODDS = "N/A"
  val EMPTY_TRUE_ODDS = 0.0

  def asState(message: SelectionUpdate) = SelectionState(
    bettingId = message.bettingId,
    participantId = message.participantId,
    marketId = message.marketId,
    status = parseStatus(message.status),
    eventId = message.eventId,
    trueOdds = message.trueOdds,
    displayOdds = message.displayOdds.getOrElse(ODDS_TO_DISPLAY, EMPTY_DISPLAY_ODDS),
    sbtechUpdateTime = message.lastUpdateDateTime,
    flinkProcessedTime = message.createdDate
  )

  def parseStatus(input: String): SelectionStatus = {
    SelectionStatus.withNameOption(input).getOrElse(Disabled)
  }
}