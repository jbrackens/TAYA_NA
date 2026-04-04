package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.rmg

import java.time.{LocalDate, LocalDateTime, ZonedDateTime}

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.partner.commons.cons.{SportType, StreamingModelType}
import net.flipsports.gmx.common.internal.partner.rmg.league.{RMGLeaguesCorrector, RMGSupportedLeagues}
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.{ProviderType, RMG}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingMethodType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{PageEvent, ProviderEvent, VideoStreamRequest, VideoStreamResult}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.{ProviderLookup, ProviderStreaming, StreamingException}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.dto.Event
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.{RMGService, RMGServiceException}

import scala.concurrent.{ExecutionContext, Future}

class RMGStreamingProvider(rmgService: RMGService, rmgEvents: RMGEventsCache,
                           supportedLeagues: RMGSupportedLeagues, namesCorrector: RMGLeaguesCorrector, timeService: TimeService)
                          (implicit ec: ExecutionContext)
  extends ProviderLookup
    with ProviderStreaming
    with StreamEventConverter
    with LazyLogging {

  override val provider: ProviderType = RMG

  private var lookup: Map[String, Event] = Map()

  override def reload(from: LocalDate, to: LocalDate): Unit = {
    val events = rmgEvents.getEvents(from, to)
    logger.debug("RMG events from cache: {}", events.size)

    lookup = events
      .filter(_.contentType != null)
      .map(event => lookupKey(event.location, event.startTime) -> event)(collection.breakOut)

    logger.debug("RMG events supported after filtering: {}", lookup.size)
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

  override def getMapping(event: PageEvent): Option[ProviderEvent] = {
    implicit val currentTime: LocalDateTime = timeService.getCurrentTime

    lookup.get(lookupKey(event.league, event.startTime))
      .map(toStreamEvent(_, provider, streamingModel(event)))
  }

  override def loadTestEvents(from: LocalDate, to: LocalDate): Seq[ProviderEvent] = Seq()

  override def loadFullDay(currentTime: LocalDateTime): Option[ProviderEvent] = None

  override def getVideoStream(request: VideoStreamRequest): Future[VideoStreamResult] = {
    rmgService.getStreamingUrl(request.providerEventId, request.userId, request.partner, request.device)
      .map(vf => {
        VideoStreamResult(vf, StreamingMethodType.PLAYER_URL)
      })
      .recover {
        case e: RMGServiceException => throw new StreamingException("RMG responded with error", e)
      }
  }

}