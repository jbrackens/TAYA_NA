package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object ClientRegistrationWrapper {

  def fromJson(json: String): ClientRegistration = new ClientRegistrationJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[ClientRegistration] = new ClientRegistrationJWrapper().fromJsonList(json).asScala

  def toJson(value: ClientRegistration) = new ClientRegistrationJWrapper().toJson(value)


}
