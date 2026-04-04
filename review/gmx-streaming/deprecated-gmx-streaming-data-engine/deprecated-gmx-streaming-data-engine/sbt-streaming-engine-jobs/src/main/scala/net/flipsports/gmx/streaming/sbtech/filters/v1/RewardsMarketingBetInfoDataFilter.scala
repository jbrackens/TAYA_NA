package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.KeyedFilterRow
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.mappers.Leagues
import org.apache.flink.api.java.tuple.Tuple2

trait RewardsMarketingBetInfoDataFilter extends KeyedFilterRow[SettlementData, SbTechConfig, Long, CasinoAndSportBetsTopupData] {

  override def filterTargetRow : (Tuple2[Long, CasinoAndSportBetsTopupData], SbTechConfig) => Boolean =
    (bet, _) => SettlementDataFilter.amountGreaterThanMinimalValue(bet.f1.getAmount)

}

object RewardsMarketingBetInfoDataFilter {

  def isInPlay(implicit correlatedSelections: CorrelatedSelections): (BetInfo) => Boolean = (bet) => correlatedSelections.getInLiveFor(bet).filter(_ == false).isEmpty

  def isInProperLeague(implicit correlatedSelections: CorrelatedSelections): BetInfo => Boolean = (bet) => {
    val betLeagues = correlatedSelections.getLeagueIdsFor(bet).toSet
    betLeagues.subsetOf(Leagues.apply)
  }

}
