package phoenix.bets.infrastructure.http

import scala.concurrent.ExecutionContext

import sttp.model.StatusCode
import sttp.tapir.EndpointInput.PathCapture
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.path
import sttp.tapir.statusCode

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext
import phoenix.bets.CancellationReason
import phoenix.bets.application.CancelBet
import phoenix.bets.infrastructure.BetJsonFormats.cancelBetRequestCodec
import phoenix.bets.infrastructure.http.BetBackofficeRoutes.betId
import phoenix.bets.infrastructure.http.BetTapirCodecs.betIdCodec
import phoenix.core.Clock
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.adminEndpoint
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator

final class BetBackofficeRoutes(basePath: MountPoint, bets: BetsBoundedContext, clock: Clock)(implicit
    ec: ExecutionContext,
    jwtAuthenticator: JwtAuthenticator)
    extends Routes
    with TapirCodecEnumeratum {

  private val cancelBetEndpoint =
    adminEndpoint.post
      .in(basePath / "bets" / betId / "cancel")
      .in(jsonBody[CancelBetRequest])
      .out(statusCode(StatusCode.NoContent))

  private val cancelBetRoute = {
    val cancelBetUseCase = new CancelBet(bets, clock)
    cancelBetEndpoint.serverLogic { adminUser =>
      {
        case (betId, cancelBetRequest) =>
          cancelBetUseCase
            .cancelBet(betId, adminUser, cancelBetRequest.cancellationReason)
            .leftMap {
              case BetsBoundedContext.UnexpectedStateError(_, _) =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.UnexpectedBetState)
            }
            .value
      }
    }
  }

  override val endpoints: Routes.Endpoints = List(cancelBetRoute)
}

final case class CancelBetRequest(cancellationReason: CancellationReason)

private object BetBackofficeRoutes {
  private val betId: PathCapture[BetId] = path[BetId]("betId")
}
