package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.sbtech.filters.v1.SettlementDataFilter
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.{Amount, CommonTransformation, StakeCalculator}
import net.flipsports.gmx.streaming.sbtech.mappers.{BetTitles, DateFormats, OperationTypes}
import org.apache.flink.api.common.functions.FlatMapFunction
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.util.Collector

class SettlementDataToTopupData(brand: Brand) extends FlatMapFunction[Tuple2[SettlementDataCustomerId, SettlementData], Tuple2[Long, CasinoAndSportBetsTopupData]] {

  override def flatMap(settlement: Tuple2[SettlementDataCustomerId, SettlementData], out: Collector[Tuple2[Long, CasinoAndSportBetsTopupData]]): Unit = {
    val candidates = SettlementDataFilter.filterAndExtractBets(settlement.f1)
    candidates.foreach{
      bet => out.collect(buildTopup(settlement.f1, bet, brand))
    }
  }

  def buildTopup(settlement: SettlementData, bet: BetInfo, brand: Brand) = new Tuple2(settlement.getPurchase.getCustomer.getCustomerID.longValue(), new CasinoAndSportBetsTopupData(
    settlement.getPurchase.getCustomer.getCustomerID.toString,
    bet.getSQLTicketID.toString,
    SettlementDataToTopupData.calculateFromBet(bet).asDouble(),
    BetTitles.BetSettlementReward,
    settlement.getPurchase.getCreationDate,
    DateFormats.toIso(settlement.getPurchase.getCreationDate),
    brand.sourceBrand.uuid,
    OperationTypes.STD,
    new util.HashMap()
  ))

}

object SettlementDataToTopupData {

  def calculateFromBet(betInfo: BetInfo): Amount = {
    val betType = CommonTransformation.toBetType(betInfo)
    val betToStake = CommonTransformation.toBetToStake(betInfo)
    StakeCalculator().calculate(
      betToStake,
      betType,
      betInfo.getNumberOfBets,
      betInfo.getComboSize
    )
  }





}
