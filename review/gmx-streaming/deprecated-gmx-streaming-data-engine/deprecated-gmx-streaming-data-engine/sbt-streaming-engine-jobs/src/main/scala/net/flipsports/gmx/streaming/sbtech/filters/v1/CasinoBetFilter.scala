package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.CasinoBet
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum.{isSettled, resolve}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.KeyedFilterRow
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import org.apache.flink.api.java.tuple.Tuple2

trait CasinoBetFilter extends KeyedFilterRow[CasinoBet, SbTechConfig, Long, CasinoAndSportBetsTopupData] {


  override def filterTargetRow : (Tuple2[Long, CasinoAndSportBetsTopupData], SbTechConfig) => Boolean =
    (bet, _) => CasinoBetFilter.amountGreaterThanMinimalValue(bet.f1.getAmount)

  override def filterSourceRow: (CasinoBet, SbTechConfig) => Boolean =
    (bet, _) => CasinoBetFilter.isNotFreeBetAndItsSettled(bet)
}

object CasinoBetFilter {

  def isNotFreeBetAndItsSettled(bet: CasinoBet) = CasinoBetFilter.isNotFreeBet(bet) &&
    CasinoBetFilter.isBetSettled(bet)

  def isNotFreeBet(bet: CasinoBet): Boolean = !bet.getIsFreeSpins

  def isBetSettled: CasinoBet => Boolean = bet => isSettled(resolve(bet.getBetStatusId))


  def amountGreaterThanMinimalValue(amount: Double) = amount > 0.01

}
