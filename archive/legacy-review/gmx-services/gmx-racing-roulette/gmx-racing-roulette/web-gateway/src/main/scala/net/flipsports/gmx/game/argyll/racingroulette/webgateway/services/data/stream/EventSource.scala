package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream

import akka.stream.scaladsl.Source
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.StateUpdate

trait EventSource {

  def provide: Source[StateUpdate, Any]

}
