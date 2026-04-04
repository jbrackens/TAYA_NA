package phoenix.oddin.unit

import enumeratum.NoSuchMember
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.oddin.domain.MarketType

final class MarketTypeValidationSpec extends AnyWordSpecLike with Matchers {
  "it should validate existing market types" in {
    MarketType.fromString("MATCH_WINNER") shouldBe Right(MarketType.MatchWinner)
    MarketType.fromString("MAP_WINNER") shouldBe Right(MarketType.MapWinner)
    MarketType.fromString("FOO_BAR") shouldBe Left(NoSuchMember("FOO_BAR", MarketType.values))
  }
}
