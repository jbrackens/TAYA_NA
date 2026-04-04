package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr

import java.time.LocalDateTime

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.EventType.EventType
import play.api.libs.json._

import scala.concurrent.Future

trait SportMediastreamClient {

  @throws(classOf[ExternalCallException])
  def callFindEvents(from: LocalDateTime, to: LocalDateTime): Future[JsValue]

  @throws(classOf[ExternalCallException])
  def callGetStreamingURLs(providerEventId: String, userId: String, partner: String, eventType: EventType): Future[JsValue]

}
