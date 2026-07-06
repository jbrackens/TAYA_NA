package phoenix.auditlog.infrastructure.http

import scala.concurrent.ExecutionContext

import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.json.circe._

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.domain.AuditLogQuery
import phoenix.auditlog.domain.AuditLogger
import phoenix.core.error.PresentationErrorCode
import phoenix.auditlog.infrastructure.AuditLogJsonFormats._
import phoenix.core.pagination.PaginatedResult
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.ErrorOut
import phoenix.http.core.TapirAuthDirectives.PresentationErrors.forbidden
import phoenix.http.core.TapirAuthDirectives.auditLogReadEndpoint
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.Permissions

final class AuditLogBackofficeRoutes(basePath: MountPoint, val auditLogger: AuditLogger)(implicit
    auth: JwtAuthenticator,
    ec: ExecutionContext)
    extends Routes
    with TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.punters.infrastructure.http.PunterTapirSchemas._

  private val listAuditLogs =
    auditLogReadEndpoint.get
      .in(basePath / "audit-logs")
      .in(EndpointInputs.pagination.queryParams)
      .in(query[Option[String]]("action"))
      .in(query[Option[String]]("actorId"))
      .in(query[Option[String]]("targetId"))
      .in(query[Option[String]]("product"))
      .in(query[Option[String]]("sortBy"))
      .in(query[Option[String]]("sortDir"))
      .out(jsonBody[PaginatedResult[AuditLogEntry]])
      .out(statusCode(StatusCode.Ok))

  private val listAuditLogsRoute = listAuditLogs.serverLogic { permissions =>
    {
      case (pagination, action, actorId, targetId, product, sortBy, sortDir) =>
        authorizeAuditAccess(permissions, product)
          .fold(
            error => scala.concurrent.Future.successful(Left(error)),
            _ =>
              auditLogger
                .listAllEntries(
                  pagination,
                  AuditLogQuery(
                    action = action,
                    actorId = actorId,
                    targetId = targetId,
                    product = product,
                    sortBy = sortBy.getOrElse("occurredAt"),
                    sortDir = sortDir.getOrElse("desc")))
                .map(_.asRight[ErrorOut]))
    }
  }

  private def authorizeAuditAccess(permissions: Permissions, product: Option[String]): Either[ErrorOut, Unit] = {
    val isPredictionScope = product.exists(_.trim.equalsIgnoreCase("prediction"))
    if (isPredictionScope) {
      Either.cond(
        permissions.canViewPredictionAuditTrail,
        (),
        forbidden(PresentationErrorCode.UserMissingPredictionOpsRole))
    } else {
      Either.cond(permissions.isAdmin, (), forbidden(PresentationErrorCode.UserMissingAdminRole))
    }
  }

  override val endpoints: Routes.Endpoints = List(listAuditLogsRoute)

}
