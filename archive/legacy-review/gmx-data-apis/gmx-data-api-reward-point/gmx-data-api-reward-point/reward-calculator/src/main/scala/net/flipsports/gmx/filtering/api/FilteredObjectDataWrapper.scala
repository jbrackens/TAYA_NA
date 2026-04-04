package net.flipsports.gmx.filtering.api

import scala.collection.JavaConverters._

object FilteredObjectDataWrapper {
  def fromJson(json: String): FilteredObjectData = new FilteredObjectDataJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[FilteredObjectData] = new FilteredObjectDataJWrapper().fromJsonList(json).asScala

  def toJson(value: FilteredObjectData) = new FilteredObjectDataJWrapper().toJson(value)


}
