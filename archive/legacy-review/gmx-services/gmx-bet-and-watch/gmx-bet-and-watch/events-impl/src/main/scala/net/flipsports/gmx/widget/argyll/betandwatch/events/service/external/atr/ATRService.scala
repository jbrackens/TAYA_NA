package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr

import java.time.LocalDateTime

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.SportMediastreamClientConverters._
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto._
import play.api.libs.json.JsValue

import scala.concurrent.{ExecutionContext, Future}

class ATRService(smsClient: SportMediastreamClient)
                (implicit ec: ExecutionContext)
  extends LazyLogging {

  @throws(classOf[ExternalCallException])
  def getAvailableEvents(from: LocalDateTime, to: LocalDateTime): Future[Seq[Event]] = {
    smsClient.callFindEvents(from, to)
      .map(responseJSON => {
        val events = responseJSON("Events").as[List[JsValue]]
        events.map(_.as[Event])
      })
  }

  @throws(classOf[ExternalCallException])
  def getStreamingUrl(providerEventId: String, userId: String, partner: String): Future[VideoStream] = {
    smsClient.callGetStreamingURLs(providerEventId, userId, partner, EventType.Live)
      .map(responseJSON => {
        val streams = responseJSON("EventInfo")("Streams").as[List[JsValue]]
        val hls = streams
          .filter(_ ("MediaFormat").as[String] == MediaFormat.HLS.toString)

        hls.map(_.as[VideoStream])
          .minBy(_.bitrate)
      })
  }
}