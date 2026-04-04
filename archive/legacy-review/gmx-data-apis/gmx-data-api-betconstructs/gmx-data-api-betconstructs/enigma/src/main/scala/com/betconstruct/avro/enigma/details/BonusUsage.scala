package com.betconstruct.avro.enigma.details

case class BonusUsage(value: Map[String, Object]) extends MapBasedEvent(value) {

  def ClientId: Long = getLong("ClientId")

  def Created: Long = getLong("Created")

  def BonusAmount: Double = get("BonusAmount")

  def BetId: Long = getLong("BetId")

  def BonusId: Long = getLong("BonusId")

  def BonusType: String = get("BonusType")

}
