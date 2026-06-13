package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{BetTypeEnum, ComboBetsTypeEnum, SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.sbtech.filters.v1.MultiBets4xRewardsBetInfoDataFilter.isPlacedInRange
import net.flipsports.gmx.streaming.sbtech.mappers.DateFormats
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class MultiBets4xRewardsBetInfoDataFilter extends InputOutputFilter[Tuple2[SettlementDataCustomerId, SettlementData],  Tuple2[Long, CasinoAndSportBetsTopupData]] {

  def input: FilterFunction[Tuple2[SettlementDataCustomerId, SettlementData]] = source => isPlacedInRange(source.f1)

  def output: FilterFunction[Tuple2[Long, CasinoAndSportBetsTopupData]] = bet => SettlementDataFilter.amountGreaterThanMinimalValue(bet.f1.getAmount)

}

object MultiBets4xRewardsBetInfoDataFilter {

  def isComboBet: (BetInfo) => Boolean = bet => {
    val betType = BetTypeEnum.resolve(bet.getBetTypeID)
    val comboSize = bet.getComboSize
    isComboBet(betType, comboSize)
  }

  def isComboBet(betType: BetTypeEnum, comboSize: Int): Boolean = betType match {
    case BetTypeEnum.ComboBets => resolveCombo(comboSize)
    case _ => false
  }

  def resolveCombo(comboSize: Int) = ComboBetsTypeEnum.resolve(comboSize) match {
    case ComboBetsTypeEnum.Skip => false
    case ComboBetsTypeEnum.SingleBet => false
    case _ => true
  }

  def isPlacedInRange: (SettlementData) => Boolean = settlementData => {
    val beginningPeriod = DateFormats.fromIso("10/02/2020 00:01:00 AM")
    val endPeriod = DateFormats.fromIso("10/04/2020 11:59:00 PM")
    val betCreatedDate = DateFormats.long2ZonedDateTime(settlementData.getPurchase.getCreationDate)
    val between = betCreatedDate.isAfter(beginningPeriod) && betCreatedDate.isBefore(endPeriod)
    val equals = betCreatedDate.isEqual(beginningPeriod) || betCreatedDate.isEqual(endPeriod)
    between || equals
  }

}