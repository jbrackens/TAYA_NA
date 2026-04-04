package net.flipsports.gmx.racingroulette.utils.external

import com.softwaremill.sttp.{sttp, _}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.Json

import scala.concurrent.{ExecutionContext, Future}

trait RouletteClient extends LazyLogging {

  implicit def backend: SttpBackend[Future, Nothing]

  implicit def ex: ExecutionContext

  def getRouletteEvent(eventId: String) = sttp
    .get(uri"http://localhost:9000/ops/events/$eventId")
    .send()
    .map(response => {
      logger.trace(s"[$eventId] Received response: {}", response)
      response.body match {
        case Left(_) =>
          logger.warn(s"[$eventId] Could not load event from Roulette")
          None
        case Right(s) =>
          Some(Json.parse(s))
      }
    })

}
