package net.flipsports.gmx.widget.argyll.betandwatch.events.api.model

import net.flipsports.gmx.common.internal.scala.json.EnumerationConverters
import play.api.libs.json.Format

object DeviceType extends Enumeration {
  type DeviceType = Value

  val MOBILE,
  DESKTOP = Value

  implicit val format: Format[DeviceType] = EnumerationConverters.enumFormat(DeviceType)
}