package phoenix.bets.integration

import io.circe.parser.decode
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetProtocol.BetRequest
import phoenix.bets.Stake
import phoenix.bets.infrastructure.BetJsonFormats.betRequestCodec
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.utils.unsafe.EitherOps

class BetRequestFormatSpec extends AnyWordSpecLike with Matchers {
  "read a list of bet requests from json" in {

    val jsonString =
      """
        [{
            "marketId": "m:o:foo",
            "selectionId": "bar",
            "stake": {
                "amount": 10.0,
                "currency": "USD"
            },
            "odds": 3.44,
            "acceptBetterOdds": true
        }]
        """

    val requests = decode[List[BetRequest]](jsonString).get

    val expectedRequests = BetRequest(
      MarketId(DataProvider.Oddin, "foo"),
      "bar",
      Stake.unsafe(DefaultCurrencyMoney(BigDecimal(10))),
      Odds(3.44),
      acceptBetterOdds = true)

    requests should contain only expectedRequests
  }
}
