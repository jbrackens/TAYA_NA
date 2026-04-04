package net.flipsports.gmx.streaming.sbtech.filters.v1

import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.Types.Bets.Source
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers.BetTypeMapper
import org.apache.flink.api.common.functions.FilterFunction

class CorrelatedBetsTotalOddsGreaterThanFilter extends FilterFunction[Types.Bets.Source]{

  override def filter(value: Source): Boolean = {
    val resolver = BetTypeMapper.lowerLimitEarningPoints
    val lowerLimit = resolver.resolve(value.f1.betType, value.f1.comboSize, value.f1.events)
    val result = value.f1.odds.exists(bet => {
      bet.odds < lowerLimit
    })
    !result
  }

}


object CorrelatedBetsTotalOddsGreaterThanFilter {

  def apply(): FilterFunction[Types.Bets.Source] = new CorrelatedBetsTotalOddsGreaterThanFilter()

}