package net.flipsports.gmx.widget.argyll.betandwatch.events.api.model

import net.flipsports.gmx.common.internal.scala.json.EnumerationConverters
import play.api.libs.json.Format

object StreamingMethodType extends Enumeration {
  type StreamingMethodType = Value

  val PLAYER_URL,
  HLS_STREAM_URL = Value

  implicit val format: Format[StreamingMethodType] = EnumerationConverters.enumFormat(StreamingMethodType)
}