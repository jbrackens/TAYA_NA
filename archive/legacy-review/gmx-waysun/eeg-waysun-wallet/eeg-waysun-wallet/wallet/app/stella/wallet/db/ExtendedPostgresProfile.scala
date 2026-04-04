package stella.wallet.db

import com.github.tminglei.slickpg.ExPostgresProfile
import com.github.tminglei.slickpg.PgArraySupport
import com.github.tminglei.slickpg.PgDate2Support
import slick.basic.Capability
import slick.jdbc.JdbcCapabilities

trait ExtendedPostgresProfile extends ExPostgresProfile with PgArraySupport with PgDate2Support {

  override protected def computeCapabilities: Set[Capability] =
    super.computeCapabilities + JdbcCapabilities.insertOrUpdate

  override val api: PostgresAPI.type = PostgresAPI

  object PostgresAPI extends API with ArrayImplicits with DateTimeImplicits
}

object ExtendedPostgresProfile extends ExtendedPostgresProfile
