package sbtech.sportsData.contracts.avro

import scala.collection.JavaConverters._

object EventsWrapper {

  def fromJson(json: String): event = new EventsJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[event] = new EventsJWrapper().fromJsonList(json).asScala

  def toJson(value: event): String = new EventsJWrapper().toJson(value)

}
