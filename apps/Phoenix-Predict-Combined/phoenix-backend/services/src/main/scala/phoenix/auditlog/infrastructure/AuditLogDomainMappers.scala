package phoenix.auditlog.infrastructure

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.infrastructure.AuditLogJsonFormats._
import phoenix.core.persistence.ExtendedPostgresProfile.api._

object AuditLogDomainMappers {

  implicit val auditLogEntryTypeMapper: BaseColumnType[AuditLogEntry] = jsonTypeMapper
}
