package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum.{isSettled, resolve}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

class CasinoBetFilter extends InputOutputFilter[FlinkTuple[CasinoBetCustomerId, CasinoBet], FlinkTuple[Long, CasinoAndSportBetsTopupData]] {
  def input: FilterFunction[FlinkTuple[CasinoBetCustomerId, CasinoBet]] = bet => CasinoBetFilter.isNotFreeBetAndItsSettled(bet.f1)

  def output: FilterFunction[FlinkTuple[Long, CasinoAndSportBetsTopupData]] = topup => CasinoBetFilter.amountGreaterThanMinimalValue(topup.f1.getAmount)

}

object CasinoBetFilter {

  def isNotFreeBetAndItsSettled(bet: CasinoBet) = CasinoBetFilter.isNotFreeBet(bet) &&
    CasinoBetFilter.isBetSettled(bet)

  def isNotFreeBet(bet: CasinoBet): Boolean = !bet.getIsFreeSpins

  def isBetSettled: CasinoBet => Boolean = bet => isSettled(resolve(bet.getBetStatusId))


  def amountGreaterThanMinimalValue(amount: Double) = amount > 0.01

}
