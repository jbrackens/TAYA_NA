package net.flipsports.gmx.common.webapi

import com.softwaremill.sttp.{ Id, RequestT, StringBody }
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{ JsError, JsSuccess, Json, Reads }

trait SttpCallOps extends LazyLogging {

  def logRequest(request: RequestT[Id, String, Nothing]): Unit = {
    logger.debug("Executing {} - URL {}", request.method.m, request.uri)
    logRequestBody(request)
  }

  private def logRequestBody(request: RequestT[Id, String, Nothing]): Unit = {
    request.body match {
      case StringBody(b, _, _) =>
        logger.debug("... with body {}", b.replaceAll("\\s+", ""))
      case _ =>
    }
  }

  def parseResponse[B](body: String)(implicit rds: Reads[B]): B = {
    Json.parse(body).validate[B] match {
      case s: JsSuccess[B] =>
        s.get
      case _: JsError =>
        throw new ExternalCallException("Parsing error")
    }
  }
}
