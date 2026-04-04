package sbtech.sportsData.contracts.avro

import scala.collection.JavaConverters._

object MarketWrapper {

  def fromJson(json: String): market = new MarketJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[market] = new MarketJWrapper().fromJsonList(json).asScala

  def toJson(value: market): String = new MarketJWrapper().toJson(value)


}
