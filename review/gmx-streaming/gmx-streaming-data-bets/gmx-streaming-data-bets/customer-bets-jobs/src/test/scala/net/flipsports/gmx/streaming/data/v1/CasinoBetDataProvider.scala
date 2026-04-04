package net.flipsports.gmx.streaming.data.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId, CasinoBetWrapper}
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

class CasinoBetDataProvider(source: String = "casinobets.json") extends DataProvider[FlinkTuple[CasinoBetCustomerId, CasinoBet]] {


  override def sourceFile: String = source

  override def fromJson(json: String): Seq[FlinkTuple[CasinoBetCustomerId, CasinoBet]] = CasinoBetWrapper.fromJsonList(json).map { el =>
    new FlinkTuple(new CasinoBetCustomerId(el.getCustomerID), el)
  }

  def allAsTuple: Seq[(CasinoBetCustomerId, CasinoBet)] = all
    .map(element => (element.f0, element.f1))

  def allAsFlinkTuple: Seq[FlinkTuple[CasinoBetCustomerId, CasinoBet]] = all

}

object CasinoBetDataProvider {

  val amount: Double = 0.3

  val BetID = 164925227

  val CustomerID = 17397820

  def apply() = new CasinoBetDataProvider()

  def apply(source: String) = new CasinoBetDataProvider(source)
}
