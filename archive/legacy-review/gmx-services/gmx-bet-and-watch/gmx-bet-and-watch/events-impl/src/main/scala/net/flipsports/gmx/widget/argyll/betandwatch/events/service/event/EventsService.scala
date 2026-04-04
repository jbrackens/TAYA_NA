package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception.{EventNotFoundException, VideoNotAvailableException}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model._

import scala.concurrent.{ExecutionContext, Future}

class EventsService(eventsLookup: EventsLookup, eventsStreaming: EventsStreaming)
                   (implicit ec: ExecutionContext)
  extends LazyLogging {

  @throws(classOf[EventNotFoundException])
  def getEventBySBTechId(sbtechId: Long): Future[EventMapping] = {
    logger.info("Get event by sbtechId = {}", sbtechId)
    Future.successful(eventsLookup.getEvent(sbtechId)
      .getOrElse(throwEventNotFound(s"sbtechId '$sbtechId")))
  }

  private def throwEventNotFound(desc: String): EventMapping = {
    throw new EventNotFoundException(s"Could not find event for '$desc'")
  }

  @throws(classOf[ExternalCallException])
  def getVideoStream(sbtechId: Long, provider: ProviderType, request: VideoStreamRequest): Future[VideoStreamResult] = {
    logger.info("Get stream by sbtechId = {}", sbtechId)

    eventsStreaming.getVideoStream(provider, request)
      .recover {
        case e: StreamingException => throwVideoNotAvailable(sbtechId, e)
      }
  }

  private def throwVideoNotAvailable(sbtechId: Long, cause: Throwable): VideoStreamResult = {
    throw new VideoNotAvailableException(s"Video not available for sbtechId '$sbtechId'", cause)
  }

  def getMapping: Future[Seq[EventMapping]] = eventsLookup.getMapping

  def getFullDayStream(provider: String): Future[EventMapping] = {
    Future.successful(eventsLookup.getFullDay(provider)
      .getOrElse(throwEventNotFound(s"full day '$provider")))
  }
}