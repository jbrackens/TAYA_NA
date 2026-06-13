package phoenix.punters

import scala.concurrent.duration._

import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.SupervisorStrategy
import akka.actor.typed.scaladsl.Behaviors
import akka.cluster.sharding.typed.ClusterShardingSettings
import akka.cluster.sharding.typed.ClusterShardingSettings.PassivationStrategySettings
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.Entity
import akka.cluster.sharding.typed.scaladsl.EntityTypeKey
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.LoggerFactory

import phoenix.cluster.NodeRole.PuntersRole
import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.core.UnitUtils.UnitCastOps
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Commands.PunterCommand
import phoenix.punters.PunterProtocol.Commands.StopPunter
object PunterShardingRegion {
  private val log = LoggerFactory.getLogger(this.objectName)

  val TypeKey: EntityTypeKey[PunterCommand] = EntityTypeKey[PunterCommand]("Punter")

  def initSharding(system: ActorSystem[_], clock: Clock): Unit = {
    val punterEntitySettings = ClusterShardingSettings(system).withPassivationStrategy(
      PassivationStrategySettings.defaults.withIdleEntityPassivation(15.minutes))
    val entity = Entity(TypeKey) { entityContext =>
      PunterShardingRegion(PunterId(entityContext.entityId), clock)
    }
    ClusterSharding(system)
      .init(entity.withSettings(punterEntitySettings).withRole(PuntersRole.entryName).withStopMessage(StopPunter))
      .toUnit()
  }

  def apply(id: PunterId, clock: Clock): Behavior[PunterCommand] =
    Behaviors.setup[PunterCommand] { _ =>
      log.info("Context: PunterShardingRegion - Starting Punter entity {}", kv("PunterId", id.value))
      Behaviors.supervise(PunterEntity(id, clock)).onFailure[IllegalStateException](SupervisorStrategy.resume)
    }
}
