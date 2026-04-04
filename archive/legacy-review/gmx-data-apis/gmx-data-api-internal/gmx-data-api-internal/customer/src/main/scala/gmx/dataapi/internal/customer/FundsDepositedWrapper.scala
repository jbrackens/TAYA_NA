package gmx.dataapi.internal.customer

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object FundsDepositedWrapper {

  def fromJson(json: String): FundsDeposited = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[FundsDeposited] = new JsonUtil().fromJsonList[FundsDeposited](json)

  def toJson(value: FundsDeposited): String = new JsonUtil().toJson(value)

}
