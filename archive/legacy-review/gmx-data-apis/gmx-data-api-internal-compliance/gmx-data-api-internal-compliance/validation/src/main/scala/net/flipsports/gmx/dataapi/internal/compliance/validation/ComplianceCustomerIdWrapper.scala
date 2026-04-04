package net.flipsports.gmx.dataapi.internal.compliance.validation


object ComplianceCustomerIdWrapper {

  def fromJson(json: String): ComplianceCustomerId = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[ComplianceCustomerId] = new JsonUtil().fromJsonList[ComplianceCustomerId](json)

  def toJson(value: ComplianceCustomerId) = new JsonUtil().toJson(value)

}
