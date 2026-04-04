package phoenix.wallets

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.cluster.sharding.typed.ShardingEnvelope
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.Entity
import akka.cluster.sharding.typed.scaladsl.EntityTypeKey
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.LoggerFactory

import phoenix.cluster.NodeRole.WalletsRole
import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.wallets.WalletActorProtocol.commands.WalletCommand
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

/**
 * WalletShardingRegion
 *
 * Provides access to initialization of the Wallets sharding region
 */
private object WalletShardingRegion {
  private val log = LoggerFactory.getLogger(this.objectName)

  val TypeKey: EntityTypeKey[WalletCommand] = EntityTypeKey[WalletCommand]("Wallet")

  def initSharding(system: ActorSystem[_])(implicit clock: Clock): ActorRef[ShardingEnvelope[WalletCommand]] =
    ClusterSharding(system).init(Entity(TypeKey) { entityContext =>
      WalletShardingRegion(WalletId(entityContext.entityId))
    }.withRole(WalletsRole.entryName))

  // Entity
  def apply(id: WalletId)(implicit clock: Clock): Behavior[WalletCommand] =
    Behaviors.setup[WalletCommand] { _ =>
      log.info("Context: WalletShardingRegion - Starting Wallet entity {}", kv("WalletId", id.value))
      WalletEntity(id)
    }
}
