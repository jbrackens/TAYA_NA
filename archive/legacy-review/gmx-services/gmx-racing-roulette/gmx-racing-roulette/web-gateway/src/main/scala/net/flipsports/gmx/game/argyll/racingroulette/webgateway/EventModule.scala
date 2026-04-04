package net.flipsports.gmx.game.argyll.racingroulette.webgateway

import akka.actor.ActorRef
import com.softwaremill.macwire.akkasupport._
import com.softwaremill.tagging._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.EventStreamDispatcherActor

trait EventModule extends BaseModule {

  lazy val eventStreamDispatcher: ActorRef @@ EventStreamDispatcherActor.Type = wireActor[EventStreamDispatcherActor]("eventStreamDispatcherActor").taggedWith[EventStreamDispatcherActor.Type]
}
