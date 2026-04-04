package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.SISStreamClientConverters._
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.dto._

import scala.concurrent.{ExecutionContext, Future}

class SISService(sisClient: SISStreamClient)
                (implicit ec: ExecutionContext)
  extends LazyLogging {

  @throws(classOf[ExternalCallException])
  def getAvailableEvents: Future[Seq[Event]] = {
    sisClient.callStreamingEvents()
      .map(_.as[List[Event]])
  }

  @throws(classOf[ExternalCallException])
  def getStreamingUrl(providerEventId: String, userId: String, partner: String): Future[VideoStream] = {
    sisClient.callStream(providerEventId, userId, partner)
      .map(_.as[VideoStream])
  }
}
