package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.Tuple2

class CasinoBetToKeyed extends MapFunction[Tuple2[Long, CasinoBet], Tuple2[CasinoBetCustomerId, CasinoBet]] {

  override def map(bet: Tuple2[Long, CasinoBet]): Tuple2[CasinoBetCustomerId, CasinoBet] = new Tuple2(new CasinoBetCustomerId(bet.f1.getCustomerID), bet.f1)

}
