package phoenix.markets

import cats.derived.auto.eq._
import org.scalacheck.ScalacheckShapeless._

import phoenix.core.serialization.CommonSerializationImplicits._
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.markets.MarketProtocol
import phoenix.markets.MarketState

final class MarketsCirceAkkaSerializerSpec extends PhoenixCirceAkkaSerializerSpec {
  roundTripFor[MarketProtocol.Commands.MarketCommand]
  roundTripFor[MarketProtocol.Responses.MarketResponse]
  goldenTestsFor[MarketProtocol.Events.MarketEvent]
  goldenTestsFor[MarketState]
}
