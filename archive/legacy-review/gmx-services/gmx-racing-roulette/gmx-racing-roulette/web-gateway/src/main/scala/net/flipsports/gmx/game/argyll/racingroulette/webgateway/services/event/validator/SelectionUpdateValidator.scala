package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.validator

import akka.event.LoggingAdapter
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.SelectionUpdate

trait SelectionUpdateValidator {

  def isActive(msg: SelectionUpdate)(implicit logger: LoggingAdapter): Boolean = msg.status match {
    case "Active" =>
      true
    case _ =>
      logger.debug(s"Invalid selection.status: ${msg.status}")
      false
  }
}
