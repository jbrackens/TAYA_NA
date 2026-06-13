package phoenix.bets

import cats.derived.auto.eq._
import org.scalacheck.Arbitrary
import org.scalacheck.ScalacheckShapeless._

import phoenix.bets._
import phoenix.core.serialization.CommonSerializationImplicits._
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.markets.MarketsBoundedContext

class BetsCirceAkkaSerializerSpec extends PhoenixCirceAkkaSerializerSpec {
  private implicit lazy val marketIdArbitrary: Arbitrary[MarketsBoundedContext.MarketId] = namespacedIdArbitrary(
    MarketsBoundedContext.MarketId.apply)
  private implicit lazy val cancellationReasonArbitrary: Arbitrary[CancellationReason] =
    Arbitrary(Arbitrary.arbitrary[String].filter(_.nonEmpty).map(CancellationReason.unsafe))
  private implicit lazy val stakeArbitrary: Arbitrary[Stake] = Arbitrary(
    defaultCurrencyMoneyArbitrary.arbitrary.filter(_.amount > 0).map(Stake.unsafe))

  roundTripFor[BetProtocol.Commands.BetCommand]
  roundTripFor[BetProtocol.Responses.BetResponse]
  goldenTestsFor[BetProtocol.Events.BetEvent]
  goldenTestsFor[BetState]
}
