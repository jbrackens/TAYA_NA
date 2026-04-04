package stella.wallet.services

import java.util.UUID

import akka.actor.typed.ActorRef
import akka.actor.typed.Behavior
import akka.actor.typed.SupervisorStrategy
import akka.actor.typed.scaladsl.Behaviors
import akka.cluster.sharding.typed.ShardingEnvelope
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.Entity
import akka.cluster.sharding.typed.scaladsl.EntityTypeKey

import stella.common.core.Clock

import stella.wallet.config.WalletAkkaConfig
import stella.wallet.models.Ids.WalletKey
import stella.wallet.services.WalletActorProtocol.WalletCommand
import stella.wallet.services.projections.WalletTags

class WalletShardingRegion(
    sharding: ClusterSharding,
    walletAkkaConfig: WalletAkkaConfig,
    walletTags: WalletTags,
    clock: Clock) {
  import WalletShardingRegion._

  def initSharding(): ActorRef[ShardingEnvelope[WalletCommand]] =
    sharding.init(Entity(TypeKey) { entityContext =>
      WalletShardingRegion(
        WalletKey.fromEntityId(UUID.fromString(entityContext.entityId)),
        walletAkkaConfig,
        walletTags,
        clock)
    }.withRole(walletNodeRole))
}
object WalletShardingRegion {
  val TypeKey: EntityTypeKey[WalletCommand] = EntityTypeKey[WalletCommand]("Wallet")

  private val walletNodeRole = "wallet"

  def apply(
      walletKey: WalletKey,
      walletAkkaConfig: WalletAkkaConfig,
      walletTags: WalletTags,
      clock: Clock): Behavior[WalletCommand] =
    Behaviors.setup[WalletCommand] { context =>
      context.log.info("Initialising sharding for Wallet entity {}", walletKey.entityId)
      Behaviors
        .supervise(WalletEntity(walletKey, walletAkkaConfig, walletTags, clock))
        .onFailure[IllegalStateException](SupervisorStrategy.resume)
    }
}
