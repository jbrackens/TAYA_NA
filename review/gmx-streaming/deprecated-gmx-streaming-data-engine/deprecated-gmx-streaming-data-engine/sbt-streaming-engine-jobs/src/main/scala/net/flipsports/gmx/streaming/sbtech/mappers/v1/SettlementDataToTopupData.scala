package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{BetTypeEnum, SettlementData}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.KeyedRowFlatMapper
import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}
import net.flipsports.gmx.streaming.sbtech.filters.v1.{BetInfoFilter, CorrelatedBets, SettlementDataFilter}
import net.flipsports.gmx.streaming.sbtech.mappers.{BetTitles, DateFormats, OperationTypes}
import org.apache.flink.api.java.tuple.Tuple2

import scala.collection.JavaConverters._

trait SettlementDataToTopupData extends KeyedRowFlatMapper[SettlementData, SbTechConfig, Long, CasinoAndSportBetsTopupData, SourceBrand] {

  /**
    * We need to add some filtering here to be able filter on BetInfo level
    *
    * @return
    */
  def mapToTarget: (SettlementData, SbTechConfig, SourceBrand) => Seq[Tuple2[Long, CasinoAndSportBetsTopupData]] = { (settlement, _, brand) =>
    val candidates = SettlementDataToTopupData.filterBets(settlement)
    candidates.foldLeft(Seq[Tuple2[Long, CasinoAndSportBetsTopupData]]()) { (result, bet) => {
      result :+ buildTopup(settlement, bet, brand)
    }}
  }


  def buildTopup(settlement: SettlementData, bet: BetInfo, brand: SourceBrand) = new Tuple2(settlement.getPurchase.getCustomer.getCustomerID.longValue(), new CasinoAndSportBetsTopupData(
    settlement.getPurchase.getCustomer.getCustomerID.toString,
    bet.getSQLTicketID.toString,
    SettlementDataToTopupData.calculateFromBet(bet),
    BetTitles.BetSettlementReward,
    settlement.getPurchase.getCreationDate,
    DateFormats.toIso(settlement.getPurchase.getCreationDate),
    brand.uuid.toString,
    OperationTypes.STD,
    new util.HashMap()
  ))

}

object SettlementDataToTopupData {

  def calculateFromBet(betInfo: BetInfo): Double =  {
    val betType = BetTypeEnum.resolve(betInfo.getBetTypeID)
    StakeCalculator.calculate(
      betToStake(betInfo),
      betType,
      betInfo.getNumberOfBets,
      betInfo.getComboSize
    )
  }

  def betToStake(bet: BetInfo): () => BigDecimal = () => BigDecimal(bet.getStake)/(StakeCalculator.stakeDivisor)

  def filterBets: (SettlementData) => Seq[BetInfo] = { (settlement) =>
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
