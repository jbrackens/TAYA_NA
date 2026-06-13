package phoenix.betgenius.streamlets

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import cloudflow.akkastream.AkkaServerStreamlet
import cloudflow.akkastream.AkkaStreamletLogic
import cloudflow.akkastream.util.scaladsl.HttpServerLogic
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.bytearray.ExternalOutlet
import io.circe._
import io.circe.parser._

import phoenix.betgenius.domain.Ingest

class BetgeniusHttpIngestor extends AkkaServerStreamlet {

  val validOut: ExternalOutlet = ExternalOutlet("valid")
  override def shape(): StreamletShape = StreamletShape.withOutlets(validOut)

  override def createLogic(): AkkaStreamletLogic = {
    new HttpServerLogic(this) {
      val validProducer = sinkRef(validOut)

      override def route(): Route = {
        post {
          path("heartbeat") {
            complete(StatusCodes.OK)
          } ~ path("ingest") {
            entity(as[String]) { s =>
              complete {
                decode[Ingest](s) match {
                  case Left(error: ParsingFailure) =>
                    log.error(s"malformed request: [$s] ${error.message}", error.underlying)
                    StatusCodes.BadRequest
                  case Left(error: DecodingFailure) =>
                    log.error(s"invalid json: [$s] error: ${error.message}")
                    StatusCodes.BadRequest
                  case Right(_) =>
                    log.info(s"Received ingest from betgenius: $s")
                    validProducer.write(s.getBytes()).map(_ => StatusCodes.OK)
                }
              }
            }
          }
        }
      }
    }
  }
}
