package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.DeviceType.{DESKTOP, DeviceType, MOBILE}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.ContentScoreboardClientConverters.xmlToEvent
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.dto.Event

import scala.concurrent.{ExecutionContext, Future}

class RMGService(csbDesktopClient: ContentScoreboardClient, csbMobileClient: ContentScoreboardClient)
                (implicit ec: ExecutionContext)
  extends LazyLogging {

  @throws(classOf[ExternalCallException])
  def getAvailableEvents: Future[Seq[Event]] = {
    csbDesktopClient.callEventList()
      .map(responseXML => {
        val events = responseXML \ "event"
        events.map(xmlToEvent)
      })
  }

  @throws(classOf[ExternalCallException])
  def getStreamingUrl(providerEventId: String, userId: String, partner: String, device: DeviceType): Future[String] = {
    val clientForDevice: ContentScoreboardClient = device match {
      case MOBILE => csbMobileClient
      case DESKTOP => csbDesktopClient
    }

    clientForDevice.callAddUser(providerEventId, userId, partner)
      .map(_ => {
        clientForDevice.buildIframeUrl(providerEventId, userId, partner)
      })
  }
}
