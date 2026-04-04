package net.flipsports.gmx.common.play

import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import play.api.mvc.RequestHeader

import scala.collection.JavaConverters._

/**
 * Checks that the WebSocket comes from the same origin. This is necessary to protect
 * against Cross-Site WebSocket Hijacking as WebSocket does not implement Same Origin Policy.
 *
 * See https://tools.ietf.org/html/rfc6455#section-1.3 and
 * http://www.christian-schneider.net/CrossSiteWebSocketHijacking.html
 */
class AllowedOriginCheck(implicit val config: Config) extends LazyLogging {

  private val allowed = config.getStringList("app.play.http.filters.origins.allowed").asScala

  def verifyRequest(rh: RequestHeader): Boolean = {
    rh.headers.get("Origin") match {
      case Some(originValue) if originMatches(originValue) =>
        logger.debug(s"ACCEPT - Origin header value $originValue")
        true

      case Some(badOrigin) =>
        logger.debug(s"REJECT - Origin header value $badOrigin is not included in allowed list")
        false

      case None =>
        logger.debug("REJECT - Origin header not found")
        false
    }
  }

  private def originMatches(origin: String): Boolean = {
    allowed.exists(origin.startsWith)
  }

}