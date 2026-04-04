package sbtech.sportsData.contracts.avro

import scala.collection.JavaConverters._

object SelectionWrapper {

  def fromJson(json: String): selection = new SelectionJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[selection] = new SelectionJWrapper().fromJsonList(json).asScala

  def toJson(value: selection): String = new SelectionJWrapper().toJson(value)


}
