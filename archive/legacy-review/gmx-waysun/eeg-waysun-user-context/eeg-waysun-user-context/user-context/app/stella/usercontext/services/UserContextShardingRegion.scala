package stella.usercontext.services

import akka.actor.typed.ActorRef
import akka.actor.typed.Behavior
import akka.actor.typed.SupervisorStrategy
import akka.actor.typed.scaladsl.Behaviors
import akka.cluster.sharding.typed.ShardingEnvelope
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.Entity
import akka.cluster.sharding.typed.scaladsl.EntityTypeKey

import stella.usercontext.models.Ids.UserContextKey
import stella.usercontext.services.UserContextActorProtocol.UserContextCommand

object UserContextShardingRegion {
  val TypeKey: EntityTypeKey[UserContextCommand] = EntityTypeKey[UserContextCommand]("UserContext")

  private val userContextNodeRole = "userContext"

  def initSharding(sharding: ClusterSharding): ActorRef[ShardingEnvelope[UserContextCommand]] =
    sharding.init(Entity(TypeKey) { entityContext =>
      UserContextShardingRegion(UserContextKey(entityContext.entityId))
    }.withRole(userContextNodeRole))

  def apply(userContextKey: UserContextKey): Behavior[UserContextCommand] =
    Behaviors.setup[UserContextCommand] { context =>
      context.log.info("Initialising sharding for UserContext entity {}", userContextKey.entityId)
      Behaviors.supervise(UserContextEntity(userContextKey)).onFailure[IllegalStateException](SupervisorStrategy.resume)
    }
}
