package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.Tuple2

class SettlementDataToKeyed extends MapFunction[SettlementData, Tuple2[SettlementDataCustomerId, SettlementData]] {

  override def map(bet: SettlementData): Tuple2[SettlementDataCustomerId, SettlementData] = new Tuple2(new SettlementDataCustomerId(bet.getPurchase.getCustomer.getCustomerID), bet)

}
