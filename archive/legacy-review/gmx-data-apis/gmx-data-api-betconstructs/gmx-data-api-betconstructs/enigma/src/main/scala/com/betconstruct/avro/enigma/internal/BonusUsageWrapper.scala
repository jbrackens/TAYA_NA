package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object BonusUsageWrapper {

  def fromJson(json: String): BonusUsage = new BonusUsageJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[BonusUsage] = new BonusUsageJWrapper().fromJsonList(json).asScala

  def toJson(value: BonusUsage) = new BonusUsageJWrapper().toJson(value)


}
