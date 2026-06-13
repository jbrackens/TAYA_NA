package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

sealed abstract class MobileDeviceOS(val name: String) {
  override def toString: String = name

  def osMatch(osName: String): Boolean = name.equalsIgnoreCase(osName)

  def osMatch(osName: MobileDeviceOS): Boolean = osMatch(osName.name)
}

object MobileDeviceOS {

  case object iOS extends MobileDeviceOS("iOS")

  case object iPadOS extends MobileDeviceOS("iPadOS")

  case object Android extends MobileDeviceOS("Android")

}