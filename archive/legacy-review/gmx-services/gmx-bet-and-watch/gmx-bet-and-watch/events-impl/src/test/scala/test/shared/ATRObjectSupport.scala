package test.shared

import java.time.{LocalDateTime, ZoneId}

import net.flipsports.gmx.common.internal.partner.atr.cons.ATRContentType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto._

trait ATRObjectSupport {

  def sampleEvent: Event = {
    Event(4411, 66, EventType.VOD, ATRContentType.AT_THE_RACES_HORSE,
      LocalDateTime.now().atZone(ZoneId.systemDefault()),
      LocalDateTime.now().plusMinutes(10).atZone(ZoneId.systemDefault()),
      "Some great race to watch", "Newcastle", "NC", "PL", LiveEventStatus.Finished, false,
      GeoRule(GeoRuleType.Allow, Seq()))
  }
}
