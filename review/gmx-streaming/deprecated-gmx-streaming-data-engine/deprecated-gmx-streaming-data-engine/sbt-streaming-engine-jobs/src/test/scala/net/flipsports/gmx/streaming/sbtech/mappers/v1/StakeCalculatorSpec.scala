package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{BetTypeEnum, ComboBetsTypeEnum}
import net.flipsports.gmx.streaming.BaseTestSpec

class StakeCalculatorSpec  extends BaseTestSpec {



  "Calculator" should {
    "scale amount with 1000" in {

      // when
      val result = StakeCalculator.multiplyAndScaleWithOneThousand(1, BigDecimal(0.5))


      // then

      result should be (500)
    }


    "scale amount with max to 0.00000001" in {

      // when
      val resultCuted = StakeCalculator.scale(0.00000000001, BigDecimal(0.5))
      val resultNormal = StakeCalculator.scale(0.000000001, BigDecimal(0.5))


      // then

      resultNormal should be (0.0000005)
      resultCuted should be (0.00000001)
    }


    "should resolve multiplier for combo values" in {
      // then
      StakeCalculator.resolveCombo(0) should be(0.0)
      StakeCalculator.resolveCombo(1) should be(0.0025)
      StakeCalculator.resolveCombo(2) should be(0.0125)
      StakeCalculator.resolveCombo(3) should be(0.0175)
      StakeCalculator.resolveCombo(4) should be(0.025)
      StakeCalculator.resolveCombo(5) should be(0.035)
    }


    "should resolve resolve betTypes " in {
      // then
      StakeCalculator.resolveMultiplier(BetTypeEnum.SingleBets, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.ComboBets, 0) should be (0.0)
      StakeCalculator.resolveMultiplier(BetTypeEnum.CasinoBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.SystemBet, 0) should be (0.015)
      StakeCalculator.resolveMultiplier(BetTypeEnum.QABet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.Forecast, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.Tricast, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.VirtualSureBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.VirtualQABet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.VirtualComboBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.VirtualSystemBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.VirtualForecastBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.VirtualTricastBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.FirstFour, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.VirtualFirstFourBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.CombinatorBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.YourBet, 0) should be (0.0025)
      StakeCalculator.resolveMultiplier(BetTypeEnum.PulseBet, 0) should be (0.0025)

    }

    "should calculate stake value" in {

      // given
      val stake = () => BigDecimal(1000.1)

      // when
      val result = StakeCalculator.calculate(stake, BetTypeEnum.SingleBets)

      // then
      result should be(2500.25)
    }

    "should calculate zero if stake is under zero" in {
      // given
      val stake = () => BigDecimal(-1.0)

      // when
      val result = StakeCalculator.calculate(stake, BetTypeEnum.SingleBets)

      // then
      result should be(0.0)
    }

    "should calculate zero if stake is zero" in {
      // given
      val stake = () => BigDecimal(0.0)

      // when
      val result = StakeCalculator.calculate(stake, BetTypeEnum.SingleBets)

      // then
      result should be(0.0)
    }


    "should not cut decimal part after dividing" in {
      // given
      val stake = () => BigDecimal(173600)/BigDecimal(3) / BigDecimal(10000)

      // when

      val result = StakeCalculator.calculate(stake, BetTypeEnum.ComboBets, 3, 3)

      // then
      result should be (303.8)
    }
  }
}
