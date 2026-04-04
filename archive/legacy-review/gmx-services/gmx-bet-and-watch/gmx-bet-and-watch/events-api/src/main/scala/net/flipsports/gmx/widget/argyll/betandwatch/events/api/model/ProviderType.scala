package net.flipsports.gmx.widget.argyll.betandwatch.events.api.model

import net.flipsports.gmx.common.internal.scala.json.EnumerationConverters
import play.api.libs.json.Format

object ProviderType extends Enumeration {
  type ProviderType = Value

  val ATR,
  RMG,
  SIS = Value

  implicit val format: Format[ProviderType] = EnumerationConverters.enumFormat(ProviderType)
}
