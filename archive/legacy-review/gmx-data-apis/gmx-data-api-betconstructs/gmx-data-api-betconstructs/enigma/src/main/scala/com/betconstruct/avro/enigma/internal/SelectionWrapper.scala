package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object SelectionWrapper {

  def fromJson(json: String): Selection = new SelectionJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[Selection] = new SelectionJWrapper().fromJsonList(json).asScala

  def toJson(value: Selection) = new SelectionJWrapper().toJson(value)


}
