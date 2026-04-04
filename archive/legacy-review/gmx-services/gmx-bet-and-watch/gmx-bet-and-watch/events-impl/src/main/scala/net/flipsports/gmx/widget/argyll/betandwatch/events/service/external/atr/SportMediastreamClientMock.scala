package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr

import java.time.LocalDateTime

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.EventType.EventType
import play.api.libs.json.{JsValue, Json}

import scala.concurrent.Future

class SportMediastreamClientMock extends SportMediastreamClient {

  def callFindEvents(from: LocalDateTime, to: LocalDateTime): Future[JsValue] = {
    Future.successful(
      Json.parse(getClass.getClassLoader.getResourceAsStream("mock/atr_sms_findevents.json"))
    )
  }

  def callGetStreamingURLs(eventId: String, userId: String, partner: String, eventType: EventType): Future[JsValue] = {
    Future.successful(
      Json.parse(getClass.getClassLoader.getResourceAsStream("mock/atr_sms_getstreamingurls.json"))
    )
  }
}
