package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sis

import java.time.{LocalDate, LocalDateTime, ZoneOffset, ZonedDateTime}

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType
import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType.WATCH_AND_BET
import net.flipsports.gmx.common.internal.partner.sis.league.SISSupportedLeagues
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.{ProviderType, SIS}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingMethodType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{PageEvent, ProviderEvent, VideoStreamRequest, VideoStreamResult}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.{ProviderLookup, ProviderStreaming}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.SISService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.dto.Event

import scala.concurrent.{ExecutionContext, Future}

class SISStreamingProvider(sisService: SISService, sisEvents: SISEventsCache,
                           supportedLeagues: SISSupportedLeagues, timeService: TimeService)
                          (implicit ec: ExecutionContext)
  extends ProviderLookup
    with ProviderStreaming
    with StreamEventConverter
    with LazyLogging {

  override val provider: ProviderType = SIS

  private var lookup: Seq[Event] = Seq()

  override def reload(from: LocalDate, to: LocalDate): Unit = {
    // full day stream might be shifted by few hours (because of the timezone), we load with margin
    val events = sisEvents.getEvents(from.minusDays(1), to.plusDays(1))
    logger.debug("SIS events from cache: {}", events.size)

    lookup = events.sortBy(_.startDateUtc.toEpochSecond)
  }

  override def isSupported(event: PageEvent): Boolean =
    supportedLeagues.isSupported(event.sportType, event.countryCode, event.league)

  override def streamingModel(event: PageEvent): StreamingModelType =
    supportedLeagues.checkStreamingModel(event.sportType, event.countryCode, event.league)

  override def getMapping(event: PageEvent): Option[ProviderEvent] = {
    implicit val currentTime: LocalDateTime = timeService.getCurrentTime

    lookup.find(_.containsDate(event.startTime))
      .map(toStreamEvent(_, provider, streamingModel(event)))
  }

  override def loadTestEvents(from: LocalDate, to: LocalDate): Seq[ProviderEvent] = Seq()

  override def loadFullDay(currentTime: LocalDateTime): Option[ProviderEvent] = {
    val refDate: ZonedDateTime = currentTime.atZone(ZoneOffset.UTC)

    lookup.find(_.containsDate(refDate))
      .map(toStreamEvent(_, provider, WATCH_AND_BET)(currentTime))
  }

  override def getVideoStream(request: VideoStreamRequest): Future[VideoStreamResult] = {
    sisService.getStreamingUrl(request.providerEventId, request.userId, request.partner)
      .map(vs => {
        VideoStreamResult(vs.hlsUrl, StreamingMethodType.HLS_STREAM_URL)
      })
  }
}