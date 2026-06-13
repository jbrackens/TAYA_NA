package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple


import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.RegistrationProduct
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class RegistrationProductEquals(val registrationProduct: RegistrationProduct) extends Predicate[ValueType] {

  override def test(record: ValueType): Boolean = registrationProduct.productMatch(record.getRegistrationProduct)

}

object RegistrationProductEquals extends Serializable {

  def mobileCasino(): RegistrationProductEquals = new RegistrationProductEquals(RegistrationProduct.MobileCasino)

  def web(): RegistrationProductEquals = new RegistrationProductEquals(RegistrationProduct.Web)

  def mobile(): RegistrationProductEquals = new RegistrationProductEquals(RegistrationProduct.Mobile)

}
