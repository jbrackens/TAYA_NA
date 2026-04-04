package sbtech.sportsData.contracts.avro

import scala.collection.JavaConverters._

object IdWrapper {

  def fromJson(json: String): id = new IdJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[id] = new IdJWrapper().fromJsonList(json).asScala

  def toJson(value: id): String = new IdJWrapper().toJson(value)


}
