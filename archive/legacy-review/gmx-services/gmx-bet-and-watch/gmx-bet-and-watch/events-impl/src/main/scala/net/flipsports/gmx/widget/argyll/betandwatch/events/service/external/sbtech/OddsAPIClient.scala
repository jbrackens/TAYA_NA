package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.LocalDateTime

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import play.api.libs.json.JsValue

import scala.concurrent.Future

trait OddsAPIClient {

  @throws(classOf[ExternalCallException])
  def callMarkets(to: LocalDateTime): Future[JsValue]

  @throws(classOf[ExternalCallException])
  def callCountries(): Future[JsValue]
}
