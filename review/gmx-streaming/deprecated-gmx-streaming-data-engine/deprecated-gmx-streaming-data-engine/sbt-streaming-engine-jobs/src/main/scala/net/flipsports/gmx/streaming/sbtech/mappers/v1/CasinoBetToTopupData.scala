package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.CasinoBet
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.KeyedRowMapper
import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}
import net.flipsports.gmx.streaming.sbtech.mappers.{BetTitles, DateFormats, OperationTypes}
import org.apache.flink.api.java.tuple.Tuple2

trait CasinoBetToTopupData extends KeyedRowMapper[CasinoBet, SbTechConfig, Long, CasinoAndSportBetsTopupData, SourceBrand] {

  def mapToTarget: (CasinoBet, SbTechConfig, SourceBrand) => Tuple2[Long, CasinoAndSportBetsTopupData] = { (bet, _, brand) =>
    new Tuple2(bet.getCustomerID.longValue(), new CasinoAndSportBetsTopupData(
      bet.getCustomerID.toString,
      bet.getBetID.toString,
      StakeCalculator.calculate( betToStake(bet), BetTypeEnum.CasinoBet),
      BetTitles.CasinoSpinReward,
      bet.getCreationDate(),
      DateFormats.toIso(bet.getCreationDate),
      brand.uuid.toString,
      OperationTypes.STD,
      new util.HashMap()
    ))
  }

  def betToStake(bet: CasinoBet): () => BigDecimal = () => { BigDecimal(bet.getStake) }

}
