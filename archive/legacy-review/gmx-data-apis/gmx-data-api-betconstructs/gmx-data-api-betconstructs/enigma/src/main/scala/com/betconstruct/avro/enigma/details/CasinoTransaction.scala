package com.betconstruct.avro.enigma.details

abstract class CasinoTransaction(value: Map[String, Object])extends MapBasedEvent(value) {

  def ClientId: Long = getLong("ClientId")

  def PartnerId: Long = getLong("Created")

  def Created: Long = getLong("Created")

  def BetId: Long = getLong("BetId")

  def TypeId: Long = getLong("TypeId")

  def GameId: Long = getLong("GameId")

  def GameProductId: Long = getLong("GameProductId")

  def GameProviderId: Long = getLong("GameProviderId")

  def GameName: String = get("GameName")

  def ProductName: String = get("ProductName")

  def ProductProviderName: String = get("ProductProviderName")

  def BetAmount: Double = get("BetAmount")

  def WinAmount: Double = get("WinAmount")
}
