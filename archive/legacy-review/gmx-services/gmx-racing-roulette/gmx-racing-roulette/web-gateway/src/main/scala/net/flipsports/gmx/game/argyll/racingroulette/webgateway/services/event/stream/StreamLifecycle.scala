package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream

object StreamLifecycle {

  case object Ack

  case object StreamInitialized

  case object StreamCompleted

  final case class StreamFailure(ex: Throwable)

}
