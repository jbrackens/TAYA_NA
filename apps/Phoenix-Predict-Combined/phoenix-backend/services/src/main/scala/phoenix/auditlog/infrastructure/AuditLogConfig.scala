package phoenix.auditlog.infrastructure

import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.config.BaseConfig

final case class AuditLogConfig(projections: AuditLogProjectionConfig)

final case class AuditLogProjectionConfig(punterEvents: PhoenixProjectionConfig)

object AuditLogConfig {
  object of extends BaseConfig[AuditLogConfig]("phoenix.auditlog")
}
