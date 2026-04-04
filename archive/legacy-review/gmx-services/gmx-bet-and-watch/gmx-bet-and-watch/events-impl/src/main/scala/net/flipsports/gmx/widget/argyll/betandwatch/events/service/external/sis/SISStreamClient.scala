package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import play.api.libs.json.JsValue

import scala.concurrent.Future

trait SISStreamClient {

  @throws(classOf[ExternalCallException])
  def callStreamingEvents(): Future[JsValue]

  @throws(classOf[ExternalCallException])
  def callStream(providerEventId: String, userId: String, partner: String): Future[JsValue]

}
