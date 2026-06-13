package phoenix.bets

import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.Entity
import akka.cluster.sharding.typed.scaladsl.EntityTypeKey

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.Commands.BetCommand
import phoenix.cluster.NodeRole.BetsRole
import phoenix.core.UnitUtils.UnitCastOps

object BetsShardingRegion {

  // Shard region
  val TypeKey: EntityTypeKey[BetCommand] = EntityTypeKey[BetCommand]("Bet")

  def initShardingRegion(system: ActorSystem[_]): Unit =
    ClusterSharding(system)
      .init(Entity(TypeKey) { entityContext =>
        BetsShardingRegion(BetId(entityContext.entityId))
      }.withRole(BetsRole.entryName))
      .toUnit()

  // Entity
  def apply(betId: BetId): Behavior[BetCommand] =
    Behaviors.setup { _ =>
      BetEntity(betId)
    }
}
