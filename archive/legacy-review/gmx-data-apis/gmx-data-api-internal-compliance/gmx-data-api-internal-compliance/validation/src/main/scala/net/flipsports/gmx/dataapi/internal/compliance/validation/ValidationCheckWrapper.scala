package net.flipsports.gmx.dataapi.internal.compliance.validation

object ValidationCheckWrapper {

  def fromJson(json: String): ValidationCheck = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[ValidationCheck] = new JsonUtil().fromJsonList[ValidationCheck](json)

  def toJson(value: ValidationCheck) = new JsonUtil().toJson(value)

}
