package test.shared

import java.time.{LocalDateTime, ZoneId}

import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType.BET_AND_WATCH
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ATR
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType.FINISHED
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.ProviderEvent

trait InternalObjectSupport {

  def sampleEvent: ProviderEvent = ProviderEvent(ATR, "4411",
    "Newcastle", LocalDateTime.now().atZone(ZoneId.systemDefault()), "Some great race to watch",
    false, FINISHED, BET_AND_WATCH,
    Seq(), Seq())
}
