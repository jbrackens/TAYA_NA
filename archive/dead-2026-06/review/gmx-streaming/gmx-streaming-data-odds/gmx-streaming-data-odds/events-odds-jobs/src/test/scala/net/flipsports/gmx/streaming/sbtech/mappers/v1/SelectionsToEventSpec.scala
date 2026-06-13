package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.data.v1.SelectionsDataProvider
import net.flipsports.gmx.streaming.sbtech.dto.{Id, Kind, Odds}
import net.flipsports.gmx.streaming.sbtech.{SportEventsTypes, asString}
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class SelectionsToEventSpec extends StreamingTestBase {

  class Mapper extends SportEventSelectionsUpdateMapper

  "Mapper" should {


    "map selections" in {
      // given
      val source = SelectionsDataProvider.single

      // when
      val result = new Mapper().map(Odds(Id("63868275-0QA63868275#745924644_22L196440Q1512386Q2-1"),Kind.Markets, DateFormats.nowEpochInMiliAtUtc(), selection = Some(source.f1)))

      // then
      result.f0.getId.toString should be("63868275-0QA63868275#745924644_22L196440Q1512386Q2-1")

      val payload = result.f1.getPayload.asInstanceOf[SportEventsTypes.SportEventSelection.ValueType]

      asString(payload.getParticipantId) should be("512386")
      asString(payload.getMarketId) should be("63868275")
      asString(payload.getEventId) should be("61")
      payload.getTrueOdds should be(81.0)
      payload.getDisplayOdds.size() should be(6)

      val odds = net.flipsports.gmx.streaming.sbtech.asMap(payload.getDisplayOdds)

      odds.get("Indo") should be("80.00")
      odds.get("Malay") should be("-0.01")
      odds.get("HK") should be("80.00")
      odds.get("American") should be("+8000")
      odds.get("Decimal") should be("81.00")

    }
  }

}
