package phoenix.auditlog.infrastructure.http

import scala.concurrent.ExecutionContext

import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.json.circe._

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.domain.AuditLogger
import phoenix.auditlog.infrastructure.AuditLogJsonFormats._
import phoenix.core.pagination.PaginatedResult
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.ErrorOut
import phoenix.http.core.TapirAuthDirectives.adminEndpoint
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator

final class AuditLogBackofficeRoutes(basePath: MountPoint, auditLogger: AuditLogger)(implicit
    auth: JwtAuthenticator,
    ec: ExecutionContext)
    extends Routes
    with TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.punters.infrastructure.http.PunterTapirSchemas._

  private val listAuditLogs =
    adminEndpoint.get
      .in(basePath / "audit-logs")
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[AuditLogEntry]])
      .out(statusCode(StatusCode.Ok))

  private val listAuditLogsRoute = listAuditLogs.serverLogic { _ => pagination =>
    auditLogger.listAllEntries(pagination).map(_.asRight[ErrorOut])
  }

  override val endpoints: Routes.Endpoints = List(listAuditLogsRoute)

}
