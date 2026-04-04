package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.KeyedFilterRow
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import org.apache.flink.api.java.tuple.Tuple2

trait SettlementDataFilter extends KeyedFilterRow[SettlementData, SbTechConfig, Long, CasinoAndSportBetsTopupData] {

  override def filterTargetRow : (Tuple2[Long, CasinoAndSportBetsTopupData], SbTechConfig) => Boolean =
    (bet, _) => SettlementDataFilter.amountGreaterThanMinimalValue(bet.f1.getAmount)

}

object SettlementDataFilter {

  def hasOriginalSqlTicketIdEmpty(bet: BetInfo): Boolean =
    bet.getOriginalSQLTicketID == null || bet.getOriginalSQLTicketID == 0

  // according to sbtech if free bet is other than 0 - its free
  def isFreeBet(bet: BetInfo): Boolean = bet.getFreeBetID != null && bet.getFreeBetID != 0

  def isNotFreeBet(bet: BetInfo): Boolean = !isFreeBet(bet)

  // rewards point calculator doesn't accepts topups with amout
  def amountGreaterThanMinimalValue(amount: Double) = amount > 0.01

  def betIdNotIn(bet: BetInfo, betIds: Seq[Long]): Boolean = !betIds.contains(bet.getSQLTicketID.toLong)

}
