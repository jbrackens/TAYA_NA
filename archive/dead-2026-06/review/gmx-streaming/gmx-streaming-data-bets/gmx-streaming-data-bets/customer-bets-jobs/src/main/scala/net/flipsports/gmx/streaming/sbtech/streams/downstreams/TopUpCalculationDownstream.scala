package net.flipsports.gmx.streaming.sbtech.streams.downstreams

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.sbtech.Types.Bets.Source
import net.flipsports.gmx.streaming.sbtech.filters.v1.{BetPlacedInRange, CorrelatedBetsTotalOddsGreaterThanFilter, FilterBetSettlementStatus}
import net.flipsports.gmx.streaming.sbtech.mappers.DateFormats
import net.flipsports.gmx.streaming.sbtech.mappers.v1.BetToTopupData
import net.flipsports.gmx.streaming.sbtech.{Implicits, Types}
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

class TopUpCalculationDownstream(brand: Brand) {

  val beginningPeriod = DateFormats.fromIso("10/15/2020 09:00:00 PM")
  val endPeriod = DateFormats.fromIso("07/31/2023 11:59:00 PM")

  def process(env: StreamExecutionEnvironment, bets: DataStream[Source]): Types.Streams.TopupStream = {
    bets
      .filter(FilterBetSettlementStatus.cashOut())
      .filter(CorrelatedBetsTotalOddsGreaterThanFilter())
      .filter(BetPlacedInRange(beginningPeriod, endPeriod))
      .map(BetToTopupData(brand))(Implicits.Topups.keyWithValue)
  }

}

object TopUpCalculationDownstream {

  def apply(brand: Brand): TopUpCalculationDownstream = new TopUpCalculationDownstream(brand)
}
