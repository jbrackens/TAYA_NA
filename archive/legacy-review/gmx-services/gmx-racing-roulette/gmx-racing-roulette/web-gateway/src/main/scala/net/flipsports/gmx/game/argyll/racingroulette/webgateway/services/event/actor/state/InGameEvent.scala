package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state


case class InGameEvent(event: Option[EventState],
                       market: Option[MarketState],
                       selections: Map[String, SelectionState] = Map[String, SelectionState]()) {

  def obtainOdds(participantId: String): Option[SelectionState] = selections.get(participantId)

  //TODO GM-920: check if all selections available for all participants
  def allStatesPresents: Boolean = event.isDefined && market.isDefined && selections.nonEmpty

  def describe: Seq[String] = {
    Seq(
      if (event.isEmpty) "EventState MISSING" else "EventState received",
      if (market.isEmpty) "MarketState MISSING" else "MarketState received",
      if (selections.isEmpty) "SelectionState MISSING" else s"SelectionState received ${selections.size}",
    )
  }
}
