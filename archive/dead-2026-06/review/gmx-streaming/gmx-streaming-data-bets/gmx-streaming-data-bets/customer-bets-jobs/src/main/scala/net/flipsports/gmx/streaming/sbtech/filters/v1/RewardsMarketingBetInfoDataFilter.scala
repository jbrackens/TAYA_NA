package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.sbtech.mappers.Leagues
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class RewardsMarketingBetInfoDataFilter extends InputOutputFilter[Tuple2[SettlementDataCustomerId, SettlementData],  Tuple2[Long, CasinoAndSportBetsTopupData]] {

  def input: FilterFunction[Tuple2[SettlementDataCustomerId, SettlementData]] = new InputOutputFilter.TrueFilter

  def output: FilterFunction[Tuple2[Long, CasinoAndSportBetsTopupData]] = bet => SettlementDataFilter.amountGreaterThanMinimalValue(bet.f1.getAmount)

}

object RewardsMarketingBetInfoDataFilter {

  def isInPlay(implicit correlatedSelections: CorrelatedSelections): (BetInfo) => Boolean = (bet) => correlatedSelections.getInLiveFor(bet).filter(_ == false).isEmpty

  def isInProperLeague(implicit correlatedSelections: CorrelatedSelections): BetInfo => Boolean = (bet) => {
    val betLeagues = correlatedSelections.getLeagueIdsFor(bet).toSet
    betLeagues.subsetOf(Leagues.apply)
  }

}
