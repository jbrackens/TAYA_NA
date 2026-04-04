package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object CasinoTransactionWrapper {

  def fromJson(json: String): CasinoTransaction = new CasinoTransactionJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[CasinoTransaction] = new CasinoTransactionJWrapper().fromJsonList(json).asScala

  def toJson(value: CasinoTransaction) = new CasinoTransactionJWrapper().toJson(value)


}
