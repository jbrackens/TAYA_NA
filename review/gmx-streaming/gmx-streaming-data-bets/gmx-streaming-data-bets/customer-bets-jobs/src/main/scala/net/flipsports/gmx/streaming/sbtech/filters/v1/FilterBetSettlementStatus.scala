package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum
import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.Types.Bets.Source
import org.apache.flink.api.common.functions.FilterFunction

protected class FilterBetSettlementStatus(status: SettlementStatusEnum) extends FilterFunction[Types.Bets.Source] {

  override def filter(bet: Source): Boolean = bet.f1.settlementStatus != status
}


object FilterBetSettlementStatus {

  def cashOut(): FilterFunction[Types.Bets.Source] = new FilterBetSettlementStatus(SettlementStatusEnum.CashOut)
}
