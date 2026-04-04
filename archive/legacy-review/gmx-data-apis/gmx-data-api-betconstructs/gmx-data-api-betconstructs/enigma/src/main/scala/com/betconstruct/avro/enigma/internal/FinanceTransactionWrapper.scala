package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object FinanceTransactionWrapper {

  def fromJson(json: String): FinanceTransaction = new FinanceTransactionJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[FinanceTransaction] = new FinanceTransactionJWrapper().fromJsonList(json).asScala

  def toJson(value: FinanceTransaction) = new FinanceTransactionJWrapper().toJson(value)


}
