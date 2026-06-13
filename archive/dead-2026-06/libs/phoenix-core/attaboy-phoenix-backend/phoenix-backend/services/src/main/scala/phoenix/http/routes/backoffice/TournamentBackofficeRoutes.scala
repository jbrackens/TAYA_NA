package phoenix.http.routes.backoffice

import scala.concurrent.ExecutionContext

import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir.EndpointInput.PathCapture
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.ErrorOut
import phoenix.http.core.TapirAuthDirectives.adminEndpoint
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.infrastructure.http.MarketTapirCodecs._
import phoenix.markets.sports.SportEntity.TournamentId

final class TournamentBackofficeRoutes(basePath: MountPoint, markets: MarketsBoundedContext)(implicit
    auth: JwtAuthenticator,
    ec: ExecutionContext)
    extends Routes
    with TapirCodecEnumeratum {

  private val makeDisplayable =
    adminEndpoint.post
      .in(basePath / "tournaments" / tournamentId / "make-displayable")
      .out(statusCode(StatusCode.NoContent))

  private val makeNotDisplayable =
    adminEndpoint.post
      .in(basePath / "tournaments" / tournamentId / "make-not-displayable")
      .out(statusCode(StatusCode.NoContent))

  private lazy val tournamentId: PathCapture[TournamentId] = path[TournamentId]("tournamentId")

  private val makeDisplayableRoute = makeDisplayable.serverLogic { _ => tournamentId =>
    markets.makeTournamentDisplayable(tournamentId).map(_.asRight[ErrorOut])
  }

  private val makeNotDisplayableRoute = makeNotDisplayable.serverLogic { _ => tournamentId =>
    markets.makeTournamentNotDisplayable(tournamentId).map(_.asRight[ErrorOut])
  }

  override val endpoints: Routes.Endpoints = List(makeDisplayableRoute, makeNotDisplayableRoute)

}
