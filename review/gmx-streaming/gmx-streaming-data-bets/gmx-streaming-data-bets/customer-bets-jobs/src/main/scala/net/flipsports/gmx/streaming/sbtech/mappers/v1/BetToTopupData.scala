package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.StakeCalculator
import net.flipsports.gmx.streaming.sbtech.mappers.{BetTitles, DateFormats, MarketingCampaignTransactionId, OperationTypes}
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

class BetToTopupData(brand: Brand) extends MapFunction[Types.Bets.Source, Types.Topup.Source] {

  override def map(source: Types.Bets.Source): Types.Topup.Source = {
      val key: Types.Bets.KeyType = source.f0
      val bet: Types.Bets.ValueType = source.f1
      val customerId = key.customerId
      val stakeCalculator =  StakeCalculator.pointEarningPoints()
      val stake = stakeCalculator.calculate(bet.stake, bet.betType, bet.numberOfBets, bet.comboSize, bet.events).asDouble()
      val outputKey = customerId.toLong
      val outputValue = new Types.Topup.Value(
        customerId,
        s"${bet.id}_${MarketingCampaignTransactionId.ammends}",
        stake,
        BetTitles.BonusRewardPointsEarningAmends,
        bet.creationDate,
        DateFormats.toIso(bet.creationDate),
        brand.sourceBrand.uuid,
        OperationTypes.BPG,
        new util.HashMap()
      )
      new FlinkTuple(outputKey, outputValue)
    }
}

object BetToTopupData {

  def apply(brand: Brand): BetToTopupData = new BetToTopupData(brand)
}
