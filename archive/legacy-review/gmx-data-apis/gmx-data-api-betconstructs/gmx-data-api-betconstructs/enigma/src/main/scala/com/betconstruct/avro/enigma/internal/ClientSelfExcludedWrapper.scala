package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object ClientSelfExcludedWrapper {

  def fromJson(json: String): ClientSelfExcluded = new ClientSelfExcludedJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[ClientSelfExcluded] = new ClientSelfExcludedJWrapper().fromJsonList(json).asScala

  def toJson(value: ClientSelfExcluded) = new ClientSelfExcludedJWrapper().toJson(value)


}
