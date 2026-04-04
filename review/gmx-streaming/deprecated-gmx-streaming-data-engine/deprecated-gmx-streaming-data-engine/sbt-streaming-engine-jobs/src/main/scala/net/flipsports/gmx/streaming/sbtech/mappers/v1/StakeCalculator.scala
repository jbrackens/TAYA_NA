package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{BetTypeEnum, ComboBetsTypeEnum}

object StakeCalculator {

  private val ONE_THOUSAND = BigDecimal(1000.0000)

  val stakeDivisor = BigDecimal(10000.0000)

  def calculate(stake: () => BigDecimal, betType: BetTypeEnum, numberOfBets: Int = 1, comboSize: Int = 1): Double = {
    val stakeValue = (stake.apply * BigDecimal(numberOfBets))
    if (stakeValue.compare(0.0) != 1) {
      0.0
    } else {
      val multiplier = resolveMultiplier(betType, comboSize)
      val result = scale(stakeValue, multiplier)
      result.toDouble
    }
  }

  def resolveMultiplier(betType: BetTypeEnum, comboSize: Int) = betType match {
      case BetTypeEnum.SingleBets => 0.0025
      case BetTypeEnum.ComboBets => resolveCombo(comboSize)
      case BetTypeEnum.CasinoBet => 0.0025
      case BetTypeEnum.SystemBet => 0.015
      case BetTypeEnum.QABet | BetTypeEnum.Forecast | BetTypeEnum.Tricast | BetTypeEnum.VirtualSureBet | BetTypeEnum.VirtualQABet | BetTypeEnum.VirtualComboBet |
           BetTypeEnum.VirtualSystemBet | BetTypeEnum.VirtualForecastBet | BetTypeEnum.VirtualTricastBet | BetTypeEnum.FirstFour | BetTypeEnum.VirtualFirstFourBet |
           BetTypeEnum.CombinatorBet | BetTypeEnum.YourBet | BetTypeEnum.PulseBet => 0.0025 // all should have multiplier like single bet
      case _ => 0.0
  }

   def resolveCombo(comboSize: Int) = ComboBetsTypeEnum.resolve(comboSize) match {
    case ComboBetsTypeEnum.Skip => 0.0 // will be filterred
    case ComboBetsTypeEnum.SingleBet => 0.0025
    case ComboBetsTypeEnum.DoubleBet => 0.0125
    case ComboBetsTypeEnum.TrebleBet => 0.0175
    case ComboBetsTypeEnum.FourFoldBet => 0.025
    case _ => 0.035 // MultiFoldBet
  }

  def scale(stake: BigDecimal, multiplier: BigDecimal): BigDecimal = {
    multiplyAndScaleWithOneThousand(stake, multiplier)
      .setScale(8, BigDecimal.RoundingMode.HALF_UP)
      .doubleValue()
  }

  def multiplyAndScaleWithOneThousand(value: BigDecimal, multiplier: BigDecimal): BigDecimal = value * multiplier * ONE_THOUSAND

}