package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2
import scala.collection.JavaConverters._

class SettlementDataFilter extends InputOutputFilter[Tuple2[SettlementDataCustomerId, SettlementData], Tuple2[Long, CasinoAndSportBetsTopupData]] {

  override def input: FilterFunction[Tuple2[SettlementDataCustomerId, SettlementData]] = new InputOutputFilter.TrueFilter()

  override def output: FilterFunction[Tuple2[Long, CasinoAndSportBetsTopupData]] = bet =>
    SettlementDataFilter.amountGreaterThanMinimalValue(bet.f1.getAmount)
}

object SettlementDataFilter {

  def hasOriginalSqlTicketIdEmpty(bet: BetInfo): Boolean = bet.getOriginalSQLTicketID == 0

  // according to sbtech if free bet is other than 0 - its free
  def isFreeBet(bet: BetInfo): Boolean = bet.getFreeBetID != null && bet.getFreeBetID != 0

  def isNotFreeBet(bet: BetInfo): Boolean = !isFreeBet(bet)

  // rewards point calculator doesn't accepts topups with amout
  def amountGreaterThanMinimalValue(amount: Double) = amount > 0.01

  def betIdNotIn(bet: BetInfo, betIds: Seq[Long]): Boolean = !betIds.contains(bet.getSQLTicketID.toLong)

  def filterAndExtractBets: (SettlementData) => Seq[BetInfo] = { (settlement) =>
    val bets = settlement.getPurchase.getBets.asScala
    val correlatedBets = CorrelatedBets.apply(bets)
    val correlatedBetsNotSettled: Seq[Long] = correlatedBets.findNotSettledBets

    bets
      .filter(SettlementDataFilter.isNotFreeBet) // reject free bet's
      .filter(SettlementDataFilter.hasOriginalSqlTicketIdEmpty) // rejects correlated bets (only parrent should be settled)
      .filter(bet => SettlementDataFilter.betIdNotIn(bet, correlatedBetsNotSettled)) // reject bets with correlaction not settled
      .filter(BetInfoFilter.isBetSettled) // reject not settled bet's
  }
}
