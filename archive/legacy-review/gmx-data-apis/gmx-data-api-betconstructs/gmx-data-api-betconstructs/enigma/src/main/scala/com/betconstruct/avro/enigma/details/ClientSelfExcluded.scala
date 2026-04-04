package com.betconstruct.avro.enigma.details

case class ClientSelfExcluded(value: Map[String, Object]) extends MapBasedEvent(value) {

  def Created: Long = getLong("Created")

  def ClientId: Integer = get("ClientId")

}

