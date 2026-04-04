package com.betconstruct.avro.enigma.details

case class Withdrawal(value: Map[String, Object]) extends FinanceTransaction(value) {
}

