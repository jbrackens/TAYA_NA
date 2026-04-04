package com.betconstruct.avro.enigma.details

abstract class FinanceTransaction(value: Map[String, Object])extends MapBasedEvent(value) {

  def ClientId: Long = getLong("ClientId")

  def Created: Long = getLong("Created")

  def TransactionDate: Long = getLong("TransactionDate")

  def Modified: Long = getLong("Modified")

  def Amount: Double = get("Amount")

  def TypeId: Long = getLong("TypeId")

  def CurrencyId: String = get("CurrencyId")

  def PaymentSystemId: Integer = get("PaymentSystemId")

  def PaymentSystemName: String = get("PaymentSystemName")

  def TransactionId: Long = getLong("TransactionId")

  //only "Confirmed" documents, State = 10
  def State: Long = getLong("State")

  def ClientTransactionCount: Long = getLong("ClientTransactionCount")
}
