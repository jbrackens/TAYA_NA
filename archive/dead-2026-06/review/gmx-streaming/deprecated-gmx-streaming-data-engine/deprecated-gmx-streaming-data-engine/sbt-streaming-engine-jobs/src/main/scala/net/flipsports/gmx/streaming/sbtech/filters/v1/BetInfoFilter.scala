package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum.resolve
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum.isSettled

object BetInfoFilter {

  def isOpened: BetInfo => Boolean = bet => resolve(bet.getBetStatus) == SettlementStatusEnum.Opened

  def isBetSettled: BetInfo => Boolean = bet => isSettled(resolve(bet.getBetStatus))

  def isBetNotSettled: BetInfo => Boolean = bet => !isBetSettled(bet)

  def filter(bets: Seq[BetInfo]) : Seq[BetInfo] = bets
}
