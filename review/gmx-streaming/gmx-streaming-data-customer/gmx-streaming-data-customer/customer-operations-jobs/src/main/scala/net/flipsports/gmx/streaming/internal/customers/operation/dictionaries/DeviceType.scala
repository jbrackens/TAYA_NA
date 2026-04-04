package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

sealed abstract class DeviceType(val name: String) extends Serializable {
  override def toString: String = name

  def deviceMatch(customerDeviceType: String): Boolean = name.equalsIgnoreCase(customerDeviceType)

}

object DeviceType {

  case object PersonalComputer extends DeviceType("Personal computer")

  case object Smartphone extends DeviceType("Smartphone")
}
