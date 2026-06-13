package net.flipsports.gmx.streaming.data.v1

import net.flipsports.gmx.streaming.sbtech.SourceTypes.Selection.{KeyType, Source}
import org.apache.flink.api.java.tuple.Tuple2
import sbtech.sportsData.contracts.avro.SelectionWrapper

object SelectionsDataProvider extends DataProvider[Source] {

  override def sourceFile: String = "selections.json"

  override def fromJson(json: String): Seq[Source] = SelectionWrapper
    .fromJsonList(json)
    .map(i =>
      new Tuple2(new KeyType(s"${i.getMarketId.toString}-${i.getId.toString}"), i)
    )

  def allAsScala() = all.map(i => (i.f0, i.f1))
}
