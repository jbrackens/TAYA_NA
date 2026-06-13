package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.sbtech.filters.v1.{CorrelatedSelections, RewardsMarketingBetInfoDataFilter, SettlementDataFilter}
import net.flipsports.gmx.streaming.sbtech.mappers.{BetTitles, DateFormats, MarketingCampaignTransactionId, OperationTypes}
import org.apache.flink.api.common.functions.FlatMapFunction
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.util.Collector


class RewardsMarketingSettlementDataToTopupData(brand: Brand) extends FlatMapFunction[Tuple2[SettlementDataCustomerId, SettlementData], Tuple2[Long, CasinoAndSportBetsTopupData]] {

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
    implicit val correlatedSelections = new CorrelatedSelections((settlement))
    val candidates = SettlementDataFilter.filterAndExtractBets(settlement)
        .filter(RewardsMarketingBetInfoDataFilter.isInPlay)
        .filter(RewardsMarketingBetInfoDataFilter.isInProperLeague)

    candidates.foldLeft(Seq[Tuple2[Long, CasinoAndSportBetsTopupData]]()) { (result, bet) => {
      result :+ buildTopup(settlement, bet)
    }}
  }

  private def buildTopup(settlement: SettlementData, bet: BetInfo) = new Tuple2(settlement.getPurchase.getCustomer.getCustomerID.longValue(), new CasinoAndSportBetsTopupData(
    settlement.getPurchase.getCustomer.getCustomerID.toString,
    s"${bet.getSQLTicketID.toString}_${MarketingCampaignTransactionId.inPlay2xPoints}",
    SettlementDataToTopupData.calculateFromBet(bet).asDouble(),
    BetTitles.BonusRewardInPLay2xPoints,
    settlement.getPurchase.getCreationDate,
    DateFormats.toIso(settlement.getPurchase.getCreationDate),
    brand.sourceBrand.uuid.toString,
    OperationTypes.BPG,
    new util.HashMap()
  ))

}


