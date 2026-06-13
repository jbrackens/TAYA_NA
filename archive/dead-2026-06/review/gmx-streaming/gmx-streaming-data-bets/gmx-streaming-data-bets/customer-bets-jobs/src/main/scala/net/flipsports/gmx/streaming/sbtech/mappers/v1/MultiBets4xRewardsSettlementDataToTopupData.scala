package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.sbtech.filters.v1.{MultiBets4xRewardsBetInfoDataFilter, SettlementDataFilter}
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.Amount
import net.flipsports.gmx.streaming.sbtech.mappers.{BetTitles, DateFormats, MarketingCampaignTransactionId, OperationTypes}
import org.apache.flink.api.common.functions.FlatMapFunction
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.util.Collector

class MultiBets4xRewardsSettlementDataToTopupData (brand: Brand) extends FlatMapFunction[Tuple2[SettlementDataCustomerId, SettlementData], Tuple2[Long, CasinoAndSportBetsTopupData]] {

  // currently 1x is from standard bets and + 3x in bonus so in overall its x4
  val multiply = Amount(3)

  override def flatMap(bet: Tuple2[SettlementDataCustomerId, SettlementData], out: Collector[Tuple2[Long, CasinoAndSportBetsTopupData]]): Unit = {
    val filteredElements = mapToTarget(bet.f1)
    filteredElements.foreach(out.collect)
  }

  /**
    * We need to add some filtering here to be able filter on BetInfo level
    *
    * @return
    */
  def mapToTarget: (SettlementData) => Seq[Tuple2[Long, CasinoAndSportBetsTopupData]] = { (settlement) =>

    val candidates = SettlementDataFilter.filterAndExtractBets(settlement)
      .filter(MultiBets4xRewardsBetInfoDataFilter.isComboBet)

    candidates.foldLeft(Seq[Tuple2[Long, CasinoAndSportBetsTopupData]]()) { (result, bet) => {
      result :+ buildTopup(settlement, bet)
    }}
  }

  private def buildTopup(settlement: SettlementData, bet: BetInfo) = {
    val amount = (SettlementDataToTopupData.calculateFromBet(bet) * multiply).scale.asDouble()

    new Tuple2(settlement.getPurchase.getCustomer.getCustomerID.longValue(), new CasinoAndSportBetsTopupData(
      settlement.getPurchase.getCustomer.getCustomerID.toString,
      s"${bet.getSQLTicketID.toString}_${MarketingCampaignTransactionId.rewards4xPoints}",
      amount,
      BetTitles.BonusReward4xPoints,
      settlement.getPurchase.getCreationDate,
      DateFormats.toIso(settlement.getPurchase.getCreationDate),
      brand.sourceBrand.uuid.toString,
      OperationTypes.BPG,
      new util.HashMap()
    ))
  }

}