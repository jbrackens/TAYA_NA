package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto

object LiveEventStatus extends Enumeration {
  type LiveEventStatus = Value
  val NotYetAvailable, Available, Finished = Value
}