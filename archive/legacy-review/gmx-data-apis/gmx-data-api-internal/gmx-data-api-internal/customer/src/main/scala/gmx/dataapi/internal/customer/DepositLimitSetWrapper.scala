package gmx.dataapi.internal.customer

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object DepositLimitSetWrapper {

  def fromJson(json: String): DepositLimitSet = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[DepositLimitSet] = new JsonUtil().fromJsonList[DepositLimitSet](json)

  def toJson(value: DepositLimitSet): String = new JsonUtil().toJson(value)

}
