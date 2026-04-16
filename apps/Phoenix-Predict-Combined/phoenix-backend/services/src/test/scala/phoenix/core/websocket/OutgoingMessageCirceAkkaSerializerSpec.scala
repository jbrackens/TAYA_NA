package phoenix.core.websocket

import cats.derived.auto.eq._
import org.scalacheck.Arbitrary
import org.scalacheck.ScalacheckShapeless._

import phoenix.bets.BetStateUpdate
import phoenix.bets.Stake
import phoenix.core.serialization.CommonSerializationImplicits._
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.websockets.messages.OutgoingMessage

class OutgoingMessageCirceAkkaSerializerSpec extends PhoenixCirceAkkaSerializerSpec {
  private implicit lazy val stakeArbitrary: Arbitrary[Stake] = Arbitrary(
    defaultCurrencyMoneyArbitrary.arbitrary.filter(_.amount > 0).map(Stake.unsafe))
  goldenTestsFor[OutgoingMessage]
  goldenTestsFor[BetStateUpdate]
  goldenTestsFor[WalletStateUpdate]
  goldenTestsFor[MarketStateUpdate]
  goldenTestsFor[FixtureStateUpdate]
}
