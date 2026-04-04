package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import net.flipsports.gmx.streaming.sbtech.dictionaries.{GameNames, GameTypes}
import net.flipsports.gmx.streaming.sbtech.model.Event
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class RewardPointEarningAmendsStandardStakeMultiplierSpec extends StreamingTestBase {

  val calculator = BetTypeMapper.pointEarningPoints()

  val blackJack = Event(
    eventName = GameNames.BlackJackMH.name,
    eventNameId = GameNames.BlackJackMH.id,
    eventType = GameTypes.BlackjackISBGames.name,
    eventTypeId = GameTypes.BlackjackISBGames.id
  )

  val other = Event(
    eventName = "",
    eventNameId = -1,
    eventType = "",
    eventTypeId = -1
  )
  "StandardStakeMultiplier" should {


    "should resolve resolve betTypes " in {
      // then
      calculator.resolve(BetTypeEnum.CasinoBet, 0).asDouble()  should be(0.0)
      calculator.resolve(BetTypeEnum.CasinoBet, 0, Seq(blackJack)).asDouble()  should be(0.0)
      calculator.resolve(BetTypeEnum.CasinoBet, 0, Seq(other)).asDouble()  should be(0.0)
    }
  }
}
