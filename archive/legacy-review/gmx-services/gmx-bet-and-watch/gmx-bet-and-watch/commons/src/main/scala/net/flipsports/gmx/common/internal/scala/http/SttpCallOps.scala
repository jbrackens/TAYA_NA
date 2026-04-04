package net.flipsports.gmx.common.internal.scala.http


import com.typesafe.scalalogging.LazyLogging
import sttp.client.{Identity, Request, Response, StringBody}

trait SttpCallOps extends LazyLogging {

  def logRequest(request: Request[Either[String, String], Nothing]): Unit = {
    logger.debug("Executing {} - URL {}", request.method.toString(), request.uri)
    logRequestBody(request)
  }

  private def logRequestBody(request: Request[Either[String, String], Nothing]): Unit = {
    request.body match {
      case StringBody(b, _, _) =>
        logger.debug("... with body {}", b.replaceAll("\\s+", ""))
      case _ =>
    }
  }


  def unsafeBody(response: Identity[Response[Either[String, String]]]): String = response.body match {
    case Left(v)  => throw new NoSuchElementException(s"Status code ${response.code}: $v")
    case Right(v) => v
  }
}