package stella.usercontext.services

import akka.actor.typed.ActorRef
import io.circe.Json

import stella.usercontext.models.StellaCirceAkkaSerializable

object UserContextActorProtocol {

  sealed trait UserContextCommand extends StellaCirceAkkaSerializable

  object UserContextCommand {
    final case class PutUserContext(userData: Json, replyTo: ActorRef[PutUserContextResponse])
        extends UserContextCommand

    final case class ModifyUserContext(userDataDiff: Json, replyTo: ActorRef[ModifyUserContextResponse])
        extends UserContextCommand
    final case class GetUserContext(replyTo: ActorRef[GetUserContextResponse]) extends UserContextCommand
    final case class DeleteUserContext(replyTo: ActorRef[DeleteUserContextResponse]) extends UserContextCommand
  }

  sealed trait PutUserContextResponse extends StellaCirceAkkaSerializable
  sealed trait ModifyUserContextResponse extends StellaCirceAkkaSerializable
  sealed trait GetUserContextResponse extends StellaCirceAkkaSerializable
  sealed trait DeleteUserContextResponse extends StellaCirceAkkaSerializable

  case object PutUserContextSucceeded extends PutUserContextResponse
  case object ModifyUserContextSucceeded extends ModifyUserContextResponse
  final case class GetUserContextValue(userData: Json) extends GetUserContextResponse
  case object DeleteUserContextSucceeded extends DeleteUserContextResponse
}
