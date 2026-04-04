package net.flipsports.gmx.rewardcalculator.api

import scala.collection.JavaConverters._

object UserRequestDataWrapper {

  def fromJson(json: String): UserRequestData = new UserRequestDataJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[UserRequestData] = new UserRequestDataJWrapper().fromJsonList(json).asScala

  def toJson(value: UserRequestData) = new UserRequestDataJWrapper().toJson(value)

}
