package phoenix.core.serialization
import akka.actor.ExtendedActorSystem
import io.circe._
import io.circe.generic.semiauto.deriveCodec
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.CirceAkkaSerializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.CirceAkkaSerializable
import phoenix.bets.infrastructure.BetsAkkaSerialization
import phoenix.core.scheduler.AkkaScheduler
import phoenix.core.websocket.OutgoingMessageSerialization
import phoenix.core.websocket.OutgoingMessageSerialization._
import phoenix.core.websocket.PhoenixStateUpdate
import phoenix.core.websocket.WebSocketMessageSingleton
import phoenix.main.Application
import phoenix.markets.infrastructure.MarketsAkkaSerialization
import phoenix.markets.infrastructure.MarketsSportsAkkaSerialization
import phoenix.punters.infrastructure.PuntersAkkaSerialization
import phoenix.sharding._
import phoenix.suppliers.SuppliersAkkaSerialization
import phoenix.wallets.infrastructure.akka.WalletsAkkaSerialization
import phoenix.websockets.messages.OutgoingMessage

/**
 * Custom Akka serializer based on Circe. All subtypes of [[phoenix.CirceAkkaSerializable]] must be registered here.
 *
 * Registration call needs three implicit arguments: TypeTag, [[io.circe.Encoder]] and [[io.circe.Decoder]]. TypeTag is provided by the compiler,
 * Encoder and Decoder are derived semiautomatically by Circe.
 * There are several scenarios, in which derivation may fail, requiring defining custom codecs in PhoenixCodecs.
 *
 * Type class derivation will fail if the type or any of its fields don't have custom-defined Encoder/Decoder and at least one of the following statements about any of them is true:
 *  - is a non-sealed trait
 *  - is a sealed trait but two or more subtypes have the same name (in a different packages)
 *  - is a non-case class
 *  - is a private case class
 *  - has a private or with different signature apply method
 *  - has a private or with different signature unapply method
 *  - is a dictionary with an non-String key (use custom [[io.circe.KeyEncoder]] and [[io.circe.KeyDecoder]])
 *
 *  @see [[phoenix.CirceAkkaSerializable]]
 */
@Serializer(classOf[CirceAkkaSerializable], """.*org\.virtuslab\.ash\.circe\.Registration\[.*\].*""")
class PhoenixCirceAkkaSerializer(actorSystem: ExtendedActorSystem)
    extends CirceAkkaSerializer[CirceAkkaSerializable](actorSystem) {
  import PhoenixCirceAkkaSerializer._

  override lazy val identifier: Int = 78

  override lazy val codecs: Seq[Registration[_ <: CirceAkkaSerializable]] = Seq(
      Register[Application.RootCommand],
      Register[AkkaScheduler.Tick.type],
      Register[WebSocketMessageSingleton.GetSourceRef[PhoenixAkkaId, PhoenixStateUpdate]],
      Register[OutgoingMessage]) ++
    BetsAkkaSerialization.codecEntries ++
    MarketsAkkaSerialization.codecEntries ++
    MarketsSportsAkkaSerialization.codecEntries ++
    PuntersAkkaSerialization.codecEntries ++
    SuppliersAkkaSerialization.codecEntries ++
    WalletsAkkaSerialization.codecEntries ++
    OutgoingMessageSerialization.codecEntries

  override lazy val manifestMigrations: Seq[(String, Class[_])] = Seq.empty
  override lazy val packagePrefix: String = "phoenix"
}

object PhoenixCirceAkkaSerializer extends PhoenixCodecs {
  private implicit lazy val rootCommandCodec: Codec[Application.RootCommand] = deriveCodec
  private implicit lazy val tickCodec: Codec[AkkaScheduler.Tick.type] = deriveCodec
  private implicit lazy val getSourceRefCodec
      : Codec[WebSocketMessageSingleton.GetSourceRef[PhoenixAkkaId, PhoenixStateUpdate]] = deriveCodec
}
