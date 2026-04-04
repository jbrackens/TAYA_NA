package com.betconstruct.avro.enigma.details

import java.util
import scala.collection.JavaConverters._

abstract class SportsbookTransaction(value: Map[String, Object]) extends MapBasedEvent(value) {

  def ClientId(): Long = getLong("ClientId")
  def BetId(): Long = getLong("BetId")
  def BetState(): Integer = get("BetState")
  def CurrencyId(): String = get("CurrencyId")
  def IsBonus(): Boolean = get("IsBonus")
  def IsLive(): Boolean = get("IsLive")
  def Created(): Long = getLong("Created")
  def Amount(): Double = get("Amount")
  def BonusAmount(): Double = get("BonusAmount")
  def BonusWinAmount(): Double = get("BonusWinAmount")
  def WinAmount(): Double = get("WinAmount")
  def SourceName(): String = get("SourceName")
  def CashDeskId(): Long = getLong("CashDeskId")
  def Type(): Integer = get("Type")
  def TypeName(): String = get("TypeName")
  def Selections: Seq[Selection] = get[util.ArrayList[util.Map[String, Object]]]("Selections")
    .asScala
    .map(elements => Selection(elements.asScala.toMap))

}
