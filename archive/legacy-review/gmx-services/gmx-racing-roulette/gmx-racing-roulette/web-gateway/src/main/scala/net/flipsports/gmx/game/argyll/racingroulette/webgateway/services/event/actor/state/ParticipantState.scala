package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.ParticipantUpdate


case class ParticipantState(id: String, position: Int, name: String, status: String)


object ParticipantState {
  def asState(message: ParticipantUpdate) = ParticipantState(
    id = message.id,
    position = message.runnerNumber.toInt,
    name = message.name,
    status = message.runnerStatus,
  )
}