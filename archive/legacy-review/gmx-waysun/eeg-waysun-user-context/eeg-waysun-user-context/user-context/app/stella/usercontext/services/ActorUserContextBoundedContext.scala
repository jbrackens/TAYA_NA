package stella.usercontext.services

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.actor.typed.ActorRef
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.EntityRef
import akka.util.Timeout
import cats.data.EitherT
import io.circe.Json

import stella.usercontext.config.UserContextServerConfig
import stella.usercontext.models.Ids.UserContextKey
import stella.usercontext.services.UserContextActorProtocol.UserContextCommand._
import stella.usercontext.services.UserContextActorProtocol._
import stella.usercontext.services.UserContextBoundedContext.Errors._

class ActorUserContextBoundedContext(sharding: ClusterSharding, config: UserContextServerConfig)
    extends UserContextBoundedContext {
  UserContextShardingRegion.initSharding(sharding)

  private implicit val askTimeout: Timeout = Timeout(config.userContextEntityAskTimeout)

  override def putUserContext(userContextKey: UserContextKey, userData: Json)(implicit
      ec: ExecutionContext): EitherT[Future, PutUserContextError, Unit] =
    runUserContextCommand[PutUserContextError, PutUserContextResponse, Unit](
      userContextKey,
      replyTo => PutUserContext(userData, replyTo)) { case PutUserContextSucceeded =>
      Right(())
    }

  override def modifyUserContext(userContextKey: UserContextKey, userDataDiff: Json)(implicit
      ec: ExecutionContext): EitherT[Future, ModifyUserContextError, Unit] =
    runUserContextCommand[ModifyUserContextError, ModifyUserContextResponse, Unit](
      userContextKey,
      replyTo => ModifyUserContext(userDataDiff, replyTo)) { case ModifyUserContextSucceeded =>
      Right(())
    }

  override def getUserContext(userContextKey: UserContextKey)(implicit
      ec: ExecutionContext): EitherT[Future, GetUserContextError, Json] =
    runUserContextCommand[GetUserContextError, GetUserContextResponse, Json](
      userContextKey,
      replyTo => GetUserContext(replyTo)) { case GetUserContextValue(userData) =>
      Right(userData)
    }

  override def deleteUserContext(userContextKey: UserContextKey)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteUserContextError, Unit] =
    runUserContextCommand[DeleteUserContextError, DeleteUserContextResponse, Unit](
      userContextKey,
      replyTo => DeleteUserContext(replyTo)) { case DeleteUserContextSucceeded =>
      Right(())
    }

  private def runUserContextCommand[UserContextError >: UnexpectedUserContextError, ActorResponse, Result](
      userContextKey: UserContextKey,
      command: ActorRef[ActorResponse] => UserContextCommand)(
      actorResponseHandler: PartialFunction[ActorResponse, Either[UserContextError, Result]])(implicit
      ec: ExecutionContext): EitherT[Future, UserContextError, Result] = {
    EitherT(userContextRef(userContextKey).ask(command).transformWith {
      case Success(response) =>
        actorResponseHandler
          .lift(response)
          .map(result => Future.successful(result))
          .getOrElse(Future.successful(Left(UnexpectedUserContextError(s"Received message $response"))))
      case Failure(exception) =>
        Future.successful(Left(UnexpectedUserContextError("Failure when processing command", exception)))
    })
  }

  private def userContextRef(userContextKey: UserContextKey): EntityRef[UserContextCommand] =
    sharding.entityRefFor(UserContextShardingRegion.TypeKey, userContextKey.entityId)
}
