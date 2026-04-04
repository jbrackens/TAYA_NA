package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object EnigmaCustomerIdWrapper {

  def fromJson(json: String): EnigmaCustomerId = new EnigmaCustomerIdJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[EnigmaCustomerId] = new EnigmaCustomerIdJWrapper().fromJsonList(json).asScala

  def toJson(value: EnigmaCustomerId) = new EnigmaCustomerIdJWrapper().toJson(value)


}
