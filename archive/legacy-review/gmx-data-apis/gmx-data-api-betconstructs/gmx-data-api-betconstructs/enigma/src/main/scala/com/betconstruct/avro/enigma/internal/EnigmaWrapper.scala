package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object EnigmaWrapper {

  def fromJson(json: String): Enigma = new EnigmaJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[Enigma] = new EnigmaJWrapper().fromJsonList(json).asScala

  def toJson(value: Enigma) = new EnigmaJWrapper().toJson(value)


}
