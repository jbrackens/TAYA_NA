package phoenix.markets

import akka.actor.typed.ActorSystem
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.Entity
import akka.cluster.sharding.typed.scaladsl.EntityTypeKey

import phoenix.cluster.NodeRole.MarketsRole
import phoenix.core.UnitUtils.UnitCastOps
import phoenix.markets.MarketProtocol.Commands.MarketCommand
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.sharding.ProjectionTags.ProjectionTag

object MarketShardingRegion {

  val TypeKey: EntityTypeKey[MarketCommand] = EntityTypeKey[MarketCommand]("Market")

  def initSharding(system: ActorSystem[_], tags: Vector[ProjectionTag]): Unit =
    ClusterSharding(system)
      .init(Entity(TypeKey) { entityContext =>
        MarketEntity(MarketId.unsafeParse(entityContext.entityId), tags)
      }.withRole(MarketsRole.entryName))
      .toUnit()

}
