package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object SportsbookTransactionWrapper {

  def fromJson(json: String): SportsbookTransaction = new SportsbookTransactionJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[SportsbookTransaction] = new SportsbookTransactionJWrapper().fromJsonList(json).asScala

  def toJson(value: SportsbookTransaction) = new SportsbookTransactionJWrapper().toJson(value)


}
