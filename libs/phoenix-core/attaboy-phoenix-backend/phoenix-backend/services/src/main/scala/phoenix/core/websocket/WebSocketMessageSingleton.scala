package phoenix.core.websocket

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.cluster.typed.ClusterSingleton
import akka.cluster.typed.SingletonActor
import akka.stream.SourceRef
import akka.stream.Supervision
import org.slf4j.LoggerFactory
import org.virtuslab.ash.annotation.SerializabilityTrait

import phoenix.CirceAkkaSerializable
import phoenix.sharding.PhoenixAkkaId

@SerializabilityTrait
trait PhoenixStateUpdate extends CirceAkkaSerializable

object WebSocketMessageSingleton {
  private val log = LoggerFactory.getLogger(getClass)

  def logErrorAndContinue(eventName: String): Supervision.Decider = { t =>
    log.warn(s"[WEBSOCKET] $eventName failure. Resuming...", t)
    Supervision.Resume
  }

  final case class GetSourceRef[ID <: PhoenixAkkaId, MESSAGE <: PhoenixStateUpdate](
      id: ID,
      replyTo: ActorRef[SourceRef[MESSAGE]])
      extends CirceAkkaSerializable

  def spawnSingletonActor[ID <: PhoenixAkkaId, MESSAGE <: PhoenixStateUpdate](
      broadcaster: Broadcaster[ID, MESSAGE],
      name: String)(implicit system: ActorSystem[_]): ActorRef[GetSourceRef[ID, MESSAGE]] =
    ClusterSingleton(system).init(SingletonActor(WebSocketMessageSingleton(broadcaster), name))

  def apply[ID <: PhoenixAkkaId, MESSAGE <: PhoenixStateUpdate](broadcaster: Broadcaster[ID, MESSAGE])(implicit
      system: ActorSystem[_]): Behavior[GetSourceRef[ID, MESSAGE]] =
    Behaviors.setup { _ =>
      Behaviors.receiveMessage[GetSourceRef[ID, MESSAGE]] {
        case GetSourceRef(id, replyTo) =>
          val sourceRef = broadcaster.createSourceRefForId(id)
          replyTo ! sourceRef
          Behaviors.same
      }
    }
}
