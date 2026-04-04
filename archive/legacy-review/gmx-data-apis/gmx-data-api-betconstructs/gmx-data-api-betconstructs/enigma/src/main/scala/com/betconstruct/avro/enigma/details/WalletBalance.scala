package com.betconstruct.avro.enigma.details

case class WalletBalance(value: Map[String, Object]) extends MapBasedEvent(value) {

  def ClientId: Long = getLong("ClientId")

  //Created_Time
  def Created: Long = getLong("Created")

  def PreliminaryBalance: Double = get("PreliminaryBalance")

  def Balance: Double = get("Balance")

  def CurrencyId: String = get("CurrencyId")
}

