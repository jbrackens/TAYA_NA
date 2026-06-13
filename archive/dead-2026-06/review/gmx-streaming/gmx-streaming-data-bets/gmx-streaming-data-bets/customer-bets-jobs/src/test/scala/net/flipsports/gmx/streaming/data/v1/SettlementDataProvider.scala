package net.flipsports.gmx.streaming.data.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId, SettlementDataWrapper}
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

class SettlementDataProvider(source: String = "settlementdata.json") extends DataProvider[FlinkTuple[SettlementDataCustomerId, SettlementData]] {

  val externalUserId = 19996852

  override def sourceFile: String = source

  override def fromJson(json: String) = SettlementDataWrapper.fromJsonList(json)
    .map(el => new FlinkTuple(new SettlementDataCustomerId(el.getPurchase.getCustomer.getCustomerID), el))

  def allAsTuple: Seq[(SettlementDataCustomerId, SettlementData)] = all
    .map(element => (element.f0, element.f1))

  def allAsFlinkTuple: Seq[FlinkTuple[SettlementDataCustomerId, SettlementData]] = all
}

object SettlementDataProvider {

  def apply(): SettlementDataProvider = new SettlementDataProvider

  def apply(source: String) = new SettlementDataProvider(source)

}
