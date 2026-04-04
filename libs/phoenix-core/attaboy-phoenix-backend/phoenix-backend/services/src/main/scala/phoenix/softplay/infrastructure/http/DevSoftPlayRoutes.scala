package phoenix.softplay.infrastructure.http

import scala.concurrent.ExecutionContext

import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.model.UsernamePassword

import phoenix.core.Clock
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.ErrorOut
import phoenix.http.core.TapirAuthDirectives.basicAuthEndpoint
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.http.routes.dev.DevRoutesConfiguration
import phoenix.softplay.application.CreateSoftPlayReport
import phoenix.softplay.domain.SoftPlayReport
import phoenix.softplay.domain.SoftPlayRepository
import phoenix.softplay.infrastructure.SoftPlayJsonFormats._

final class DevSoftPlayRoutes(
    softPlayRepository: SoftPlayRepository,
    devRoutesConfiguration: DevRoutesConfiguration,
    clock: Clock)(implicit ec: ExecutionContext)
    extends Routes
    with TapirCodecEnumeratum {

  private val softPlayReport =
    basicAuthEndpoint(
      UsernamePassword(
        devRoutesConfiguration.username.value,
        password = Some(devRoutesConfiguration.password.value))).get
      .in("soft-play-report")
      .out(jsonBody[SoftPlayReport])
      .out(statusCode(StatusCode.Ok))

  private val softPlayReportRoute = {
    val createSoftPlayReport = new CreateSoftPlayReport(softPlayRepository)
    softPlayReport.serverLogic { _ => _ =>
      createSoftPlayReport.createReport(clock.currentOffsetDateTime()).map(_.asRight[ErrorOut])
    }
  }

  override val endpoints: Routes.Endpoints = List(softPlayReportRoute)

}
