package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers.BetTypeMapper
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers.BetTypeMapper.Multiplier
import net.flipsports.gmx.streaming.sbtech.model.Event

class StakeCalculator(multiplierResolver: BetTypeMapper[Multiplier]) {

  def calculate(stake: Amount, betType: BetTypeEnum, numberOfBets: Int = 1, comboSize: Int = 1, events: Seq[Event] = Seq()): Amount = {
    val stakeValue = stake * Amount(numberOfBets)
    if (stakeValue.compare(Amount.ZERO) != 1) {
      Amount.ZERO
    } else {
      val multiplier = multiplierResolver.resolve(betType, comboSize, events)
      multiplyAndScale(stakeValue, multiplier)

    }
  }

  def multiplyAndScale(left: Amount, right: Amount): Amount =
    (left * right).scale(StakeCalculatorConstants.ONE_THOUSAND)
}


object StakeCalculator {

  def apply(): StakeCalculator = new StakeCalculator(BetTypeMapper.apply())

  def pointEarningPoints(): StakeCalculator = new StakeCalculator(BetTypeMapper.pointEarningPoints())

}