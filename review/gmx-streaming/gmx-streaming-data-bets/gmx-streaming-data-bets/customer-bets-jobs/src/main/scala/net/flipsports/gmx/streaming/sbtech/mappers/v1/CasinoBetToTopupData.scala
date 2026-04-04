package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.{Amount, StakeCalculator}
import net.flipsports.gmx.streaming.sbtech.mappers.{BetTitles, DateFormats, OperationTypes}
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

class CasinoBetToTopupData(brand: Brand) extends MapFunction[FlinkTuple[CasinoBetCustomerId, CasinoBet], FlinkTuple[Long, CasinoAndSportBetsTopupData]] {

  override def map(source: FlinkTuple[CasinoBetCustomerId, CasinoBet]): FlinkTuple[Long, CasinoAndSportBetsTopupData] =  {
    val bet = source.f1
    new FlinkTuple(bet.getCustomerID.longValue(), new CasinoAndSportBetsTopupData(
      bet.getCustomerID.toString,
      bet.getBetID.toString,
      StakeCalculator().calculate( betToStake(bet), BetTypeEnum.CasinoBet).asDouble(),
      BetTitles.CasinoSpinReward,
      bet.getCreationDate(),
      DateFormats.toIso(bet.getCreationDate),
      brand.sourceBrand.uuid,
      OperationTypes.STD,
      new util.HashMap()
    ))
  }

  def betToStake(bet: CasinoBet): Amount = Amount(bet.getStake)
}
