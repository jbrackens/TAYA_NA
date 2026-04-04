package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.LocalDateTime

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import play.api.libs.json.JsValue

import scala.concurrent.Future

trait DataAPIClient {

  @throws(classOf[ExternalCallException])
  def callPlayerDetails(userId: String): Future[JsValue]

  @throws(classOf[ExternalCallException])
  def callOpenBets(from: LocalDateTime, to: LocalDateTime): Future[JsValue]

}
