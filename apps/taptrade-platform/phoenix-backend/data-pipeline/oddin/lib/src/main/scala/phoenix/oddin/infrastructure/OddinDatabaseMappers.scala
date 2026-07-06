package phoenix.oddin.infrastructure
import enumeratum.SlickEnumSupport

import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.oddin.domain.OddinMarketId

object OddinDatabaseMappers extends SlickEnumSupport {

  override val profile = ExtendedPostgresProfile

  implicit val oddinMarketIdMapper: BaseColumnType[OddinMarketId] =
    MappedColumnType.base[OddinMarketId, String](_.value, OddinMarketId.unsafe)
}
