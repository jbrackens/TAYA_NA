package phoenix.markets.sports

import akka.actor.typed.ActorSystem
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.Entity
import akka.cluster.sharding.typed.scaladsl.EntityTypeKey

import phoenix.core.Clock
import phoenix.core.UnitUtils.UnitCastOps
import phoenix.markets.FiltersConfig
import phoenix.markets.sports.SportProtocol.Commands.SportCommand

object SportsShardingRegion {

  val TypeKey: EntityTypeKey[SportCommand] = EntityTypeKey[SportCommand]("Sport")

  def initSharding(filtersConfig: FiltersConfig, clock: Clock, system: ActorSystem[_]): Unit = {
    ClusterSharding(system)
      .init(Entity(TypeKey) { entityContext =>
        SportEntity(SportEntity.SportId.unsafeParse(entityContext.entityId), filtersConfig, clock)
      })
      .toUnit()
  }
}
