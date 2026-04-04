package net.flipsports.gmx.streaming.sbtech.streams.builders

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.streaming.sbtech.filters.v1.SettlementDataFilter
import net.flipsports.gmx.streaming.sbtech.mappers.v1.SportBetsToBetMapper
import net.flipsports.gmx.streaming.sbtech.{Implicits, Types}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class SportBetsStreamBuilder {

  def build(sourceFunction: SourceFunction[Types.SportBets.Source], env: StreamExecutionEnvironment): Types.Streams.BetsStream = {
    env
      .addSource(sourceFunction)(Implicits.SportBets.keyWithValue)
      .filter(inputFilter())
      .name("sport-bets-source")
      .flatMap(SportBetsToBetMapper.map)(Implicits.Bets.keyWithValue)
  }

  def inputFilter(): FilterFunction[tuple.Tuple2[SettlementDataCustomerId, SettlementData]] = new SettlementDataFilter().input
}


object SportBetsStreamBuilder {

  def apply() = new SportBetsStreamBuilder

}