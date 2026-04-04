package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import java.time.{LocalDate, LocalDateTime}

import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{PageEvent, ProviderEvent}

trait ProviderLookup {

  def provider: ProviderType

  def reload(from: LocalDate, to: LocalDate): Unit

  def isSupported(event: PageEvent): Boolean

  def streamingModel(event: PageEvent): StreamingModelType

  def getMapping(event: PageEvent): Option[ProviderEvent]

  def loadFullDay(currentTime: LocalDateTime): Option[ProviderEvent]

  def loadTestEvents(from: LocalDate, to: LocalDate): Seq[ProviderEvent]

}
