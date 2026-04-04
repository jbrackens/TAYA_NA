package com.betconstruct.avro.enigma.details

case class ClientRegistration(value: Map[String, Object]) extends MapBasedEvent(value) {

  //Created_Time
  def Created: Long = getLong("Created")

  def ClientId: Long = getLong("ClientId")

}

