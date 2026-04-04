package com.betconstruct.avro.enigma.details

case class ClientLogin(value: Map[String, Object]) extends MapBasedEvent(value) {

  //Session_start_time
  def Created: Long = getLong("Created")

  def LoginIp: String = get("LoginIp")

  def SessionId: Long = getLong("SessionId")

  def SourceName: String = get("SourceName")


}

