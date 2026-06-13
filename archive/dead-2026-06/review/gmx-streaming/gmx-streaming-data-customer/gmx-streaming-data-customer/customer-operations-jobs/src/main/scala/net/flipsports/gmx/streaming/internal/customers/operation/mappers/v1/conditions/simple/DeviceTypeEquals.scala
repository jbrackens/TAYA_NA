package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.DeviceType
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class DeviceTypeEquals(val deviceType: DeviceType) extends Predicate[ValueType] {

  override def test(record: ValueType): Boolean = {
    deviceType.deviceMatch(record.login.getDeviceType)
  }
}

object DeviceTypeEquals extends Serializable {

  def personalComputerRegistration(): DeviceTypeEquals = new DeviceTypeEquals(DeviceType.PersonalComputer)

  def smartphoneRegistration(): DeviceTypeEquals = new DeviceTypeEquals(DeviceType.Smartphone)

}

