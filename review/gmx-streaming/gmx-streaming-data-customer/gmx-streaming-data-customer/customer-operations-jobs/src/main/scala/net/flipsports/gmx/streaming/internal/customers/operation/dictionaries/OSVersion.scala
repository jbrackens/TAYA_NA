package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate

sealed abstract class OSVersion(val mobieleOS: MobileDeviceOS,val name: Option[String]) {
  lazy val code = s"$mobieleOS ${name.getOrElse("")}"

  override def toString: String = code

  def osVersionMatch(os: Option[OSVersion]): Boolean = os match {
    case Some(osVersion) => osVersionMatch(osVersion)
    case None => false
  }

  def osVersionMatch(os: OSVersion): Boolean = {
    val operationSystemMatch = mobieleOS.osMatch(os.mobieleOS)
    val osVersionMatch = name match {
      case None => false
      case Some(name) => name.trim.equalsIgnoreCase(os.name.getOrElse("").trim)
    }
    operationSystemMatch && osVersionMatch
  }

  def osVersionNameMatch(candidate: String): Boolean =
    code.trim.toLowerCase.equalsIgnoreCase(candidate.trim.toLowerCase)

}

object OSVersion {

  case object iOS extends OSVersion(MobileDeviceOS.iOS, None)

  case object iOS_10 extends OSVersion(MobileDeviceOS.iOS, Some("10"))

  case object iOS_11 extends OSVersion(MobileDeviceOS.iOS, Some("11"))

  case object iOS_12 extends OSVersion(MobileDeviceOS.iOS, Some("12"))

  case object iOS_13 extends OSVersion(MobileDeviceOS.iOS, Some("13"))

  case object iOS_6 extends OSVersion(MobileDeviceOS.iOS, Some("6"))

  case object iOS_8 extends OSVersion(MobileDeviceOS.iOS, Some("8"))

  case object iOS_9 extends OSVersion(MobileDeviceOS.iOS, Some("9"))

  case object iPadOS_Default extends OSVersion(MobileDeviceOS.iPadOS, None)

  case object Android_10 extends OSVersion(MobileDeviceOS.Android, Some("10"))

  case object Android_40xIceCreamSandwich extends OSVersion(MobileDeviceOS.Android, Some("4.0.x Ice Cream Sandwich"))

  case object Android_42JellyBean extends OSVersion(MobileDeviceOS.Android, Some("4.2 Jelly Bean"))

  case object Android_43JellyBean extends OSVersion(MobileDeviceOS.Android, Some("4.3 Jelly Bean"))

  case object Android_44KitKat extends OSVersion(MobileDeviceOS.Android, Some("4.4 KitKat"))

  case object Android_50lollipop extends OSVersion(MobileDeviceOS.Android, Some("5.0 lollipop"))

  case object Android_51lollipop extends OSVersion(MobileDeviceOS.Android, Some("5.1 lollipop"))

  case object Android_60Marshmallow extends OSVersion(MobileDeviceOS.Android, Some("6.0 Marshmallow"))

  case object Android_70Nougat extends OSVersion(MobileDeviceOS.Android, Some("7.0 Nougat"))

  case object Android_71Nougat extends OSVersion(MobileDeviceOS.Android, Some("7.1 Nougat"))

  case object Android_8Oreo extends OSVersion(MobileDeviceOS.Android, Some("8 Oreo"))

  case object Android_80Oreo extends OSVersion(MobileDeviceOS.Android, Some("8.0 Oreo"))

  case object Android_81Oreo extends OSVersion(MobileDeviceOS.Android, Some("8.1 Oreo"))

  case object Android_90Pie extends OSVersion(MobileDeviceOS.Android, Some("9.0 Pie"))

  def values: Set[OSVersion] = sealerate.values[OSVersion]

  def apply(osName: String): Option[OSVersion] = values.filter(_.osVersionNameMatch(osName)).headOption

  val iOSPack = values.filterNot(_.mobieleOS == MobileDeviceOS.Android).toSeq

  val androidPack = values.filter(_.mobieleOS == MobileDeviceOS.Android).toSeq
}
