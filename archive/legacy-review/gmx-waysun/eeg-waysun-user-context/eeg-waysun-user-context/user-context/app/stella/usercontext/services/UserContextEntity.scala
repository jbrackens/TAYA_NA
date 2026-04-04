package stella.usercontext.services

import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.persistence.typed.state.scaladsl.DurableStateBehavior
import akka.persistence.typed.state.scaladsl.Effect
import akka.persistence.typed.state.scaladsl.ReplyEffect

import stella.usercontext.models.Ids.UserContextKey
import stella.usercontext.models.Ids.UserContextPersistenceId
import stella.usercontext.models.UserContextState
import stella.usercontext.models.UserContextState._
import stella.usercontext.services.UserContextActorProtocol.UserContextCommand._
import stella.usercontext.services.UserContextActorProtocol._

object UserContextEntity {

  def apply(userContextKey: UserContextKey): Behavior[UserContextCommand] =
    Behaviors.setup[UserContextCommand] { context =>
      context.log.info("Starting UserContext entity {}", userContextKey.entityId)
      DurableStateBehavior.withEnforcedReplies[UserContextCommand, UserContextState](
        persistenceId = UserContextPersistenceId.of(UserContextShardingRegion.TypeKey, userContextKey),
        emptyState = UserData.empty,
        commandHandler = commandHandler)
    }

  def commandHandler: (UserContextState, UserContextCommand) => ReplyEffect[UserContextState] =
    (state, command) =>
      (state, command) match {
        case (_, PutUserContext(userData, replyTo)) =>
          val newState = UserData(userData)
          Effect.persist(newState).thenReply(replyTo)(_ => PutUserContextSucceeded)
        case (userData: UserData, ModifyUserContext(userDataDiff, replyTo)) =>
          val newState = userData.mergedWith(userDataDiff)
          Effect.persist(newState).thenReply(replyTo)(_ => ModifyUserContextSucceeded)
        case (UserData(currentData), GetUserContext(replyTo)) =>
          Effect.reply(replyTo)(GetUserContextValue(currentData))
        case (_, DeleteUserContext(replyTo)) =>
          Effect.persist(UserData.empty).thenReply(replyTo)(_ => DeleteUserContextSucceeded)
      }
}
