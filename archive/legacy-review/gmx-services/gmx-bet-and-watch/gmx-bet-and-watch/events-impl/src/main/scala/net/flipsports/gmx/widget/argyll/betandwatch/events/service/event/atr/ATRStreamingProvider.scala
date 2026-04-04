package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.atr

import java.time.{LocalDate, LocalDateTime, ZonedDateTime}

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.partner.atr.league.{ATRLeaguesCorrector, ATRSupportedLeagues}
import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType.WATCH_AND_BET
import net.flipsports.gmx.common.internal.partner.commons.cons.{SportType, StreamingModelType}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.{ATR, ProviderType}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingMethodType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{PageEvent, ProviderEvent, VideoStreamRequest, VideoStreamResult}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.{ProviderLookup, ProviderStreaming, StreamingException}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto._
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.{ATRService, ATRServiceException}

import scala.concurrent.{ExecutionContext, Future}

class ATRStreamingProvider(atrService: ATRService, atrEvents: ATREventsCache, supportedLeagues: ATRSupportedLeagues, namesCorrector: ATRLeaguesCorrector)
                          (implicit ec: ExecutionContext)
  extends ProviderLookup
    with ProviderStreaming
    with StreamEventConverter
    with LazyLogging {

  override val provider: ProviderType = ATR

  private var lookup: Map[String, Event] = Map()

  override def reload(from: LocalDate, to: LocalDate): Unit = {
    val events = atrEvents.getEvents(from, to)
    logger.debug("ATR events from cache: {}", events.size)

    lookup = events
      .filter(_.contentType != null)
      .filter(event => isSupported(event.contentType.getSportType, event.country, event.location))
      .map(event => lookupKey(event.location, event.startTime) -> event)(collection.breakOut)

    logger.debug("ATR events supported after filtering: {}", lookup.size)
  }

  private def isSupported(sportType: SportType, countryCode: String, league: String): Boolean =
    supportedLeagues.isSupported(sportType, countryCode, correctLeague(league))

  private def lookupKey(league: String, startTime: ZonedDateTime): String =
    s"${correctLeague(league).toLowerCase}${startTime.toEpochSecond}"

  private def correctLeague(in: String): String =
    namesCorrector.correctName(in).orElse(in)

  override def isSupported(event: PageEvent): Boolean =
    isSupported(event.sportType, event.countryCode, event.league)

  override def streamingModel(event: PageEvent): StreamingModelType =
    supportedLeagues.checkStreamingModel(event.sportType, event.countryCode, correctLeague(event.league))

  override def getMapping(event: PageEvent): Option[ProviderEvent] =
    lookup.get(lookupKey(event.league, event.startTime))
      .map(toStreamEvent(_, provider, streamingModel(event)))

  override def loadTestEvents(from: LocalDate, to: LocalDate): Seq[ProviderEvent] = {
    val testEvents = atrEvents.getTestEvents(from, to)
    logger.debug("TEST events from cache: {}", testEvents.size)

    testEvents.map(toStreamEvent(_, provider, WATCH_AND_BET))
  }

  override def loadFullDay(currentTime: LocalDateTime): Option[ProviderEvent] = None

  override def getVideoStream(request: VideoStreamRequest): Future[VideoStreamResult] = {
    atrService.getStreamingUrl(request.providerEventId, request.userId, request.partner)
      .map(vs => {
        VideoStreamResult(vs.url, StreamingMethodType.HLS_STREAM_URL)
      })
      .recover {
        case e: ATRServiceException => throw new StreamingException("ATR responded with error", e)
      }
  }
}