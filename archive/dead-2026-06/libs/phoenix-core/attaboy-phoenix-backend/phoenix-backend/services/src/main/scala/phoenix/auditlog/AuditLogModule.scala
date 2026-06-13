package phoenix.auditlog

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.auditlog.application.es.PunterEventHandler
import phoenix.auditlog.domain.AuditLogger
import phoenix.auditlog.infrastructure.AuditLogConfig
import phoenix.auditlog.infrastructure.SlickAuditLogRepository
import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.core.Clock
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.jwt.JwtAuthenticator
import phoenix.punters.PuntersProjectionRunner

final class AuditLogModule(val auditLogger: AuditLogger, val backofficeRoutes: AuditLogBackofficeRoutes)

object AuditLogModule {

  def init(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)(implicit
      system: ActorSystem[_],
      ec: ExecutionContext,
      jwtAuthenticator: JwtAuthenticator): AuditLogModule = {
    val repository = new SlickAuditLogRepository(dbConfig)
    val auditLogConfig = AuditLogConfig.of(system)
    val auditLogger = new AuditLogger(repository, clock)

    PuntersProjectionRunner
      .build(system, dbConfig)
      .runProjection(auditLogConfig.projections.punterEvents, new PunterEventHandler(auditLogger))

    val backofficeRoutes = new AuditLogBackofficeRoutes(BackofficeRoutes.adminMountPoint, auditLogger)

    new AuditLogModule(auditLogger, backofficeRoutes)
  }
}
