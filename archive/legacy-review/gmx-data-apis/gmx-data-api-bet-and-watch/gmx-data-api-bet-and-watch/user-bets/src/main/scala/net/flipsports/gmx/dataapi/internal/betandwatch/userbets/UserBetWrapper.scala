package net.flipsports.gmx.dataapi.internal.betandwatch.userbets

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object UserBetWrapper {

  def fromJson(json: String): UserBet = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[UserBet] = new JsonUtil().fromJsonList[UserBet](json)

  def toJson(value: UserBet) = new JsonUtil().toJson(value)

}
