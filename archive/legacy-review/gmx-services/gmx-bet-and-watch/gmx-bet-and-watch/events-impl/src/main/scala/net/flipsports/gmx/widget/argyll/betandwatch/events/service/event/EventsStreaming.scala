package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.logging.PrettyPrint.prettyToString
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{VideoStreamRequest, VideoStreamResult}

import scala.concurrent.{ExecutionContext, Future}

class EventsStreaming(providerStreaming: Set[ProviderStreaming])
                     (implicit ec: ExecutionContext)
  extends LazyLogging {

  private val providerMap: Map[ProviderType, ProviderStreaming] = providerStreaming
    .map(p => p.provider -> p)(collection.breakOut)

  @throws(classOf[ExternalCallException])
  def getVideoStream(provider: ProviderType, request: VideoStreamRequest): Future[VideoStreamResult] = {
    providerMap.get(provider)
      .map(foundProvider => {
        logger.info(s"Generate VideoStream for provider = $provider with ${prettyToString(request)}")
        foundProvider.getVideoStream(request)
          .map(result => {
            logger.info(s"Generated VideoStream with ${prettyToString(result)}")
            result
          })
      })
      .getOrElse(throwProviderNotAvailable(provider))
  }

  private def throwProviderNotAvailable(provider: ProviderType): Future[VideoStreamResult] = {
    Future(throw new StreamingException(s"No streaming found for provider $provider"))
  }

}
