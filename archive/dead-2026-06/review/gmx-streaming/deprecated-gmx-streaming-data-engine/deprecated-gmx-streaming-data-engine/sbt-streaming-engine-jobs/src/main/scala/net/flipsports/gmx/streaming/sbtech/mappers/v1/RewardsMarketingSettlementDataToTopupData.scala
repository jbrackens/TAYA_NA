package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.KeyedRowFlatMapper
import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}
import net.flipsports.gmx.streaming.sbtech.filters.v1.{CorrelatedSelections, RewardsMarketingBetInfoDataFilter}
import net.flipsports.gmx.streaming.sbtech.mappers.{BetTitles, DateFormats, MarketingCampaignTransactionId, OperationTypes}
import org.apache.flink.api.java.tuple.Tuple2


trait RewardsMarketingSettlementDataToTopupData extends KeyedRowFlatMapper[SettlementData, SbTechConfig, Long, CasinoAndSportBetsTopupData, SourceBrand] {

  /**
    * We need to add some filtering here to be able filter on BetInfo level
    *
    * @return
    */
  override def mapToTarget: (SettlementData, SbTechConfig, SourceBrand) => Seq[Tuple2[Long, CasinoAndSportBetsTopupData]] = { (settlement, _, brand) =>
    implicit val correlatedSelections = new CorrelatedSelections((settlement))
    val candidates = SettlementDataToTopupData.filterBets(settlement)
        .filter(RewardsMarketingBetInfoDataFilter.isInPlay)
        .filter(RewardsMarketingBetInfoDataFilter.isInProperLeague)

    candidates.foldLeft(Seq[Tuple2[Long, CasinoAndSportBetsTopupData]]()) { (result, bet) => {
      result :+ buildTopup(settlement, bet, brand)
    }}
  }

  private def buildTopup(settlement: SettlementData, bet: BetInfo, brand: SourceBrand) = new Tuple2(settlement.getPurchase.getCustomer.getCustomerID.longValue(), new CasinoAndSportBetsTopupData(
    settlement.getPurchase.getCustomer.getCustomerID.toString,
    s"${bet.getSQLTicketID.toString}_${MarketingCampaignTransactionId.inPlay2xPoints}",
    SettlementDataToTopupData.calculateFromBet(bet),
    BetTitles.BonusRewardInPLay2xPoints,
    settlement.getPurchase.getCreationDate,
    DateFormats.toIso(settlement.getPurchase.getCreationDate),
    brand.uuid.toString,
    OperationTypes.BPG,
    new util.HashMap()
  ))

}


