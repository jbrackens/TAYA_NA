package phoenix.betgenius.infrastructure.http
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.http.scaladsl.server.Route
import io.circe.parser._
import sttp.model
import sttp.tapir.server.akkahttp.AkkaHttpServerInterpreter

import phoenix.betgenius.domain.Ingest
import phoenix.betgenius.infrastructure.BetgeniusFeed

final class BetgeniusRoutes(feed: BetgeniusFeed)(implicit ec: ExecutionContext) {

  private val heartbeatRoute =
    BetgeniusEndpoints.heartbeat.serverLogic { _ =>
      Future(Right(()): Either[Unit, Unit])
    }

  private val ingestRoute =
    BetgeniusEndpoints.ingest.serverLogic { body =>
      decode[Ingest](body).fold(
        _ => Future.successful(Left(model.StatusCode.BadRequest)),
        ingest => feed.publish(ingest).map(_ => Right(())))
    }

  private val all = List(heartbeatRoute, ingestRoute)

  val toAkkaHttp: Route = AkkaHttpServerInterpreter().toRoute(all)
}
