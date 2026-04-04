package net.flipsports.gmx.streaming.data.v1

import org.apache.flink.api.java.tuple.Tuple2
import sbtech.sportsData.contracts.avro.{SelectionWrapper, selection}

object OperatorSelectionsDataProvider extends DataProvider[Tuple2[String, selection]] {

  override def sourceFile: String = "selections.json"

  override def fromJson(json: String) = SelectionWrapper.fromJsonList(json).map(i => new Tuple2(s"${i.getMarketId.toString}-${i.getId.toString}", i))

}
