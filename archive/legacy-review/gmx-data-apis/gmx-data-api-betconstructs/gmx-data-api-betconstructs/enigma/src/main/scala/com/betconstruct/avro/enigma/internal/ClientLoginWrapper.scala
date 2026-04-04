package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object ClientLoginWrapper {

  def fromJson(json: String): ClientLogin = new ClientLoginJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[ClientLogin] = new ClientLoginJWrapper().fromJsonList(json).asScala

  def toJson(value: ClientLogin) = new ClientLoginJWrapper().toJson(value)


}
