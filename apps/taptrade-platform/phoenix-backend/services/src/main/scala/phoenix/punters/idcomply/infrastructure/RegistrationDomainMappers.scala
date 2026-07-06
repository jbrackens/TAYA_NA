package phoenix.punters.idcomply.infrastructure

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.punters.idcomply.domain.Events.RegistrationEvent
import phoenix.punters.idcomply.infrastructure.RegistrationJsonFormats._

object RegistrationDomainMappers {
  implicit val registrationEventMapper: BaseColumnType[RegistrationEvent] = jsonTypeMapper
}
