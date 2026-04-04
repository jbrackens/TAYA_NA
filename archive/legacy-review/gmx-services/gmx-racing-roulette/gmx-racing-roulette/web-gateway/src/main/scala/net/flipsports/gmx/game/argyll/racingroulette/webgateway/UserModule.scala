package net.flipsports.gmx.game.argyll.racingroulette.webgateway

import akka.actor.ActorRef
import com.softwaremill.macwire.akkasupport._
import com.softwaremill.tagging._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.UserWebsocketProviderActor

trait UserModule extends EventModule with RouletteModule with BaseModule {

  lazy val userStreamProvider: ActorRef @@ UserWebsocketProviderActor.Type = wireActor[UserWebsocketProviderActor]("userStreamProviderActor").taggedWith[UserWebsocketProviderActor.Type]
}
