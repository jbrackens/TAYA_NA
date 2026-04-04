package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object ClientDetailsWrapper {

  def fromJson(json: String): ClientDetails = new ClientDetailsJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[ClientDetails] = new ClientDetailsJWrapper().fromJsonList(json).asScala

  def toJson(value: ClientDetails) = new ClientDetailsJWrapper().toJson(value)


}
