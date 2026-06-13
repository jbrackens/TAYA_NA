package phoenix.websockets.infrastructure

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.sharding.ProjectionTags.ProjectionTag

object WebsocketDomainMappers {

  implicit val offsetKeyMapper: BaseColumnType[ProjectionTag] =
    MappedColumnType.base[ProjectionTag, String](_.value, ProjectionTag.apply)
}
