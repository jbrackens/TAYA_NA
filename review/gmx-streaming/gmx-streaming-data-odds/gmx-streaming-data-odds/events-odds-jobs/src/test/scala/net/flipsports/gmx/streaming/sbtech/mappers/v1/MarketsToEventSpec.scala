package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.data.v1.MarketsDataProvider
import net.flipsports.gmx.streaming.sbtech.dto.{Id, Kind, Odds}
import net.flipsports.gmx.streaming.sbtech.{SportEventsTypes, asString}
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class MarketsToEventSpec extends StreamingTestBase  {

  class Mapper extends SportEventMarketsUpdateMapper

  "MarketsToEvent mapper" should {

    "map markets details" in {
      val source = MarketsDataProvider.single

      // when
      val result = new Mapper().map(Odds(Id("63868275"),Kind.Markets, DateFormats.nowEpochInMiliAtUtc(), market = Some(source.f1)))

      // then
      val payload = result.f1.getPayload.asInstanceOf[SportEventsTypes.SportEventMarket.ValueType]

      asString(result.f0.getId) should be("63868275")
      asString(payload.getMarketTypeId) should  be ("341")
      asString(payload.getEventId) should be ("63868275")
    }
  }

}
