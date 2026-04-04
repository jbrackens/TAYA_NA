package phoenix.websockets

import akka.actor.typed.ActorRef
import akka.stream.SourceRef
import cats.derived.auto.eq._
import cats.kernel.Eq
import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import org.scalacheck.ScalacheckShapeless._

import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.core.websocket.PhoenixStateUpdate
import phoenix.core.websocket.WebSocketMessageSingleton
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.sports.SportEntity
import phoenix.punters.PunterEntity
import phoenix.sharding.PhoenixAkkaId
import phoenix.wallets.WalletsBoundedContextProtocol

class GetSourceRefCirceAkkaSerializerSpec extends PhoenixCirceAkkaSerializerSpec {
  private implicit val phoenixIdEq: Eq[PhoenixAkkaId] = Eq.fromUniversalEquals
  private implicit val phoenixIdArbitrary: Arbitrary[PhoenixAkkaId] = Arbitrary(
    Gen.oneOf(
      Arbitrary.arbitrary[MarketsBoundedContext.MarketId],
      namespacedIdArbitrary(SportEntity.FixtureId.apply).arbitrary,
      Arbitrary.arbitrary[PunterEntity.PunterId],
      Arbitrary.arbitrary[WalletsBoundedContextProtocol.WalletId]))
  private implicit val actorRefSourceEq: Eq[ActorRef[SourceRef[PhoenixStateUpdate]]] = Eq.fromUniversalEquals
  private implicit val actorRefSourceArbitrary: Arbitrary[ActorRef[SourceRef[PhoenixStateUpdate]]] = Arbitrary(
    Gen.const(system.deadLetters))
  goldenTestsFor[WebSocketMessageSingleton.GetSourceRef[PhoenixAkkaId, PhoenixStateUpdate]]
}
