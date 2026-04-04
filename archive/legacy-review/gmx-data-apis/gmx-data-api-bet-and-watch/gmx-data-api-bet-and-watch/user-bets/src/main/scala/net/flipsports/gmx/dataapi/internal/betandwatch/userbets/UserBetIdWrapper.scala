package net.flipsports.gmx.dataapi.internal.betandwatch.userbets

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object UserBetIdWrapper {

  def fromJson(json: String): UserBetId = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[UserBetId] = new JsonUtil().fromJsonList[UserBetId](json)

  def toJson(value: UserBetId) = new JsonUtil().toJson(value)

}
