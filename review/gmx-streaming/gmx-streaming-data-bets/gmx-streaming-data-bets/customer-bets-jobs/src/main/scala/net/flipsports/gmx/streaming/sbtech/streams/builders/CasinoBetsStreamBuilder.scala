package net.flipsports.gmx.streaming.sbtech.streams.builders

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import net.flipsports.gmx.streaming.sbtech.filters.v1.CasinoBetFilter
import net.flipsports.gmx.streaming.sbtech.mappers.v1.CasinoBetToBetMapper
import net.flipsports.gmx.streaming.sbtech.{Implicits, Types}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class CasinoBetsStreamBuilder {

  def build(sourceFunction: SourceFunction[Types.CasinoBets.Source], env: StreamExecutionEnvironment): Types.Streams.BetsStream = {
    env
      .addSource(sourceFunction)(Implicits.CasinoBets.keyWithValue)
      .filter(inputFilter())
      .name("casino-bets-source")
      .map(CasinoBetToBetMapper.map)(Implicits.Bets.keyWithValue)
  }

  def inputFilter(): FilterFunction[tuple.Tuple2[CasinoBetCustomerId, CasinoBet]] = new CasinoBetFilter().input
}


object CasinoBetsStreamBuilder {

  def apply() = new CasinoBetsStreamBuilder

}