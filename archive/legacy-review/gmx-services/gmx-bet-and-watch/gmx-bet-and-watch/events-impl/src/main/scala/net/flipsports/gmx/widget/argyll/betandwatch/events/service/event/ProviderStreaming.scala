package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import net.flipsports.gmx.common.internal.scala.core.exception.BaseException
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{VideoStreamRequest, VideoStreamResult}

import scala.concurrent.Future

trait ProviderStreaming {

  def provider: ProviderType

  def getVideoStream(request: VideoStreamRequest): Future[VideoStreamResult]

}

class StreamingException(message: String) extends BaseException(message) {
  def this(message: String, cause: Throwable) {
    this(message)
    initCause(cause)
  }
}

