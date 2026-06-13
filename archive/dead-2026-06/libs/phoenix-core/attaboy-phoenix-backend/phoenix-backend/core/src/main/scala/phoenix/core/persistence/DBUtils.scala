package phoenix.core.persistence

import akka.NotUsed
import akka.stream.scaladsl.Source
import slick.dbio.Effect
import slick.jdbc.JdbcProfile
import slick.sql.FixedSqlStreamingAction

import phoenix.core.persistence.ExtendedPostgresProfile.api._

object DBUtils {
  def streamingSource[P <: JdbcProfile, R, T, E <: Effect](
      db: P#Backend#Database,
      action: FixedSqlStreamingAction[R, T, E],
      fetchSize: Int = 200): Source[T, NotUsed] = {
    val streamingQuery = action.transactionally.withStatementParameters(fetchSize = fetchSize)
    Source.fromPublisher(db.stream(streamingQuery))
  }
}
