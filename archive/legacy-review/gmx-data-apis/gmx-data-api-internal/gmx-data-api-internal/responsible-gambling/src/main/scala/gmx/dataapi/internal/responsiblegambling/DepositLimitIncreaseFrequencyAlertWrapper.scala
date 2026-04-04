package gmx.dataapi.internal.responsiblegambling

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object DepositLimitIncreaseFrequencyAlertWrapper {

  def fromJson(json: String): DepositLimitIncreaseFrequencyAlert = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[DepositLimitIncreaseFrequencyAlert] = new JsonUtil().fromJsonList[DepositLimitIncreaseFrequencyAlert](json)

  def toJson(value: DepositLimitIncreaseFrequencyAlert) = new JsonUtil().toJson(value)
}
