package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.{Amount, StakeCalculator}
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class StakeCalculatorSpec  extends StreamingTestBase {

  val calculator = StakeCalculator()

  "Calculator" should {
    "scale amount with 1000" in {

      // when
      val result = calculator.multiplyAndScale(Amount(1), Amount(0.5))


      // then

      result.value should be (500)
    }


    "scale amount with max to 0.00000001" in {

      // when
      val resultCuted = calculator.multiplyAndScale(Amount(0.00000000001), Amount(0.5))
      val resultNormal = calculator.multiplyAndScale(Amount(0.000000001), Amount(0.5))


      // then

      resultNormal.asDouble() should be (0.0000005)
      resultCuted.asDouble() should be (0.00000001)
    }


    "should calculate stake value" in {

      // given
      val stake = Amount(1000.1)

      // when
      val result = calculator.calculate(stake, BetTypeEnum.SingleBets)

      // then
      result.value should be(500.05)
    }

    "should calculate zero if stake is under zero" in {
      // given
      val stake = Amount(-1.0)

      // when
      val result = calculator.calculate(stake, BetTypeEnum.SingleBets)

      // then
      result.value should be(0.0)
    }

    "should calculate zero if stake is zero" in {
      // given
      val stake = Amount(0.0)

      // when
      val result = calculator.calculate(stake, BetTypeEnum.SingleBets)

      // then
      result.value should be(0.0)
    }


    "should not cut decimal part after dividing" in {
      // given
      val stake = Amount(173600)/Amount(3) / Amount(10000)

      // when

      val result = calculator.calculate(stake, BetTypeEnum.ComboBets, 3, 3)

      // then
      result.value should be (303.8)
    }
  }
}
