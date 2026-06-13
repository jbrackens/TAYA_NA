package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class StandardStakeMultiplierSpec extends StreamingTestBase {

  val calculator = BetTypeMapper()
  "StandardStakeMultiplier" should {

    "should resolve multiplier for combo values" in {
      // then
      calculator.resolve(BetTypeEnum.ComboBets,0).asDouble()  should be(0.0)
      calculator.resolve(BetTypeEnum.ComboBets,1).asDouble()  should be(0.0005)
      calculator.resolve(BetTypeEnum.ComboBets,2).asDouble()  should be(0.005)
      calculator.resolve(BetTypeEnum.ComboBets,3).asDouble()  should be(0.0175)
      calculator.resolve(BetTypeEnum.ComboBets,4).asDouble()  should be(0.025)
      calculator.resolve(BetTypeEnum.ComboBets,5).asDouble()  should be(0.035)
    }


    "should resolve resolve betTypes " in {
      // then
      calculator.resolve(BetTypeEnum.SingleBets, 0).asDouble()  should be(0.0005)
      calculator.resolve(BetTypeEnum.ComboBets, 0).asDouble()  should be(0.0)
      calculator.resolve(BetTypeEnum.CasinoBet, 0).asDouble()  should be(0.0005)
      calculator.resolve(BetTypeEnum.SystemBet, 0).asDouble()  should be(0.005)
      calculator.resolve(BetTypeEnum.QABet, 0).asDouble()  should be(0.0005)
      calculator.resolve(BetTypeEnum.Forecast, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.Tricast, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.VirtualSureBet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.VirtualQABet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.VirtualComboBet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.VirtualSystemBet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.VirtualForecastBet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.VirtualTricastBet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.FirstFour, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.VirtualFirstFourBet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.CombinatorBet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.YourBet, 0).asDouble()  should be(0.0025)
      calculator.resolve(BetTypeEnum.PulseBet, 0).asDouble()  should be(0.0025)

    }
  }
}
