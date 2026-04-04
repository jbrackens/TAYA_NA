package com.betconstruct.avro.enigma.details

case class BonusAccepted(value: Map[String, Object]) extends MapBasedEvent(value) {

  def ClientId: Long = getLong("ClientId")

  def BonusId: Long = getLong("BonusId")

  def Created: Long = getLong("Created")

  def TransactionId: Long = getLong("TransactionId")

  def AcceptanceDate: Long = getLong("AcceptanceDate")

  def Amount: Double = get("Amount")

  def BonusType: String = get("BonusType")

}
