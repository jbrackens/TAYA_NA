package net.flipsports.gmx.streaming.data.v1

import net.flipsports.gmx.streaming.sbtech.SourceTypes.Market.{KeyType, Source}
import org.apache.flink.api.java.tuple.Tuple2
import sbtech.sportsData.contracts.avro.MarketWrapper

object MarketsDataProvider extends DataProvider[Source] {

  override def sourceFile: String = "markets.json"

  override def fromJson(json: String)= MarketWrapper
    .fromJsonList(json)
    .map(i =>
      new Tuple2(new KeyType(i.getId), i)
    )

  def allAsScala() = all.map(i => (i.f0, i.f1))
}
