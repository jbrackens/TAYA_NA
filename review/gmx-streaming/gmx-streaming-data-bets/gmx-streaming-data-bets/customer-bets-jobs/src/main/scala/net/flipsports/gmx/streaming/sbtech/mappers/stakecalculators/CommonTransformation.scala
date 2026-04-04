package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo

object CommonTransformation {

  def toBetToStake(bet: BetInfo): Amount =   Amount(bet.getStake) / StakeCalculatorConstants.stakeDivisor

  def toBetType(bet: BetInfo): BetTypeEnum = BetTypeEnum.resolve(bet.getBetTypeID)
}
