package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object BonusAcceptedWrapper {

  def fromJson(json: String): BonusAccepted = new BonusAcceptedJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[BonusAccepted] = new BonusAcceptedJWrapper().fromJsonList(json).asScala

  def toJson(value: BonusAccepted) = new BonusAcceptedJWrapper().toJson(value)


}
