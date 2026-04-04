package com.betconstruct.avro.enigma

import scala.collection.JavaConverters._

object EnigmaMessageCustomerIdWrapper {

  def fromJson(json: String): EnigmaMessageCustomerId = new EnigmaMessageCustomerIdJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[EnigmaMessageCustomerId] = new EnigmaMessageCustomerIdJWrapper().fromJsonList(json).asScala

  def toJson(value: EnigmaMessageCustomerId) = new EnigmaMessageCustomerIdJWrapper().toJson(value)


}
