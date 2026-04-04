package com.betconstruct.avro.enigma.internal

import scala.collection.JavaConverters._

object ClientDetailsInLoginWrapper {

  def fromJson(json: String): ClientDetailsInLogin = new ClientDetailsInLoginJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[ClientDetailsInLogin] = new ClientDetailsInLoginJWrapper().fromJsonList(json).asScala

  def toJson(value: ClientDetailsInLogin) = new ClientDetailsInLoginJWrapper().toJson(value)


}
