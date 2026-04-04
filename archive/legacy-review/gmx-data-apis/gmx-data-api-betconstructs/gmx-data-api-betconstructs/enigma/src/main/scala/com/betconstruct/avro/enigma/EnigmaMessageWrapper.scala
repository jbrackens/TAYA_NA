package com.betconstruct.avro.enigma

import scala.collection.JavaConverters._
object EnigmaMessageWrapper {

  def fromJson(json: String): EnigmaMessage = new EnigmaMessageJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[EnigmaMessage] = new EnigmaMessageJWrapper().fromJsonList(json).asScala

  def toJson(value: EnigmaMessage) = new EnigmaMessageJWrapper().toJson(value)


}
