package phoenix.punters.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.LimitChange
import phoenix.punters.domain.LimitPeriodType
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.ResponsibleGamblingLimitType
import phoenix.punters.infrastructure.PunterDomainMappers._

final class SlickPunterLimitsHistoryRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends PunterLimitsHistoryRepository {
  import dbConfig.db

  private val punterLimits: TableQuery[LimitsHistoryTable] = TableQuery[LimitsHistoryTable]

  override def insert(limitChange: LimitChange): Future[Unit] =
    db.run(punterLimits += limitChange).map(_ => ())

  override def findLimits(pagination: Pagination, punterId: PunterId): Future[PaginatedResult[LimitChange]] = {
    val filteredLimits = punterLimits.filter(_.punterId === punterId).sortBy(_.requestedAt.desc)
    findPaginatedQuery(pagination, filteredLimits)
  }

  private def findPaginatedQuery(pagination: Pagination, limits: Query[LimitsHistoryTable, LimitChange, Seq])(implicit
      ec: ExecutionContext): Future[PaginatedResult[LimitChange]] = {
    val databaseQuery = for {
      records <- limits.drop(pagination.offset).take(pagination.itemsPerPage).result
      totalCount <- limits.length.result
    } yield PaginatedResult(records, totalCount, pagination)

    db.run(databaseQuery)
  }
}

private final class LimitsHistoryTable(tag: Tag) extends Table[LimitChange](tag, "punter_limits_history") {

  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def punterId = column[PunterId]("punter_id")
  def limitType = column[ResponsibleGamblingLimitType]("limit_type")
  def period = column[LimitPeriodType]("period_type")
  def limit = column[String]("limit_value")
  def effectiveFrom = column[OffsetDateTime]("effective_from")
  def requestedAt = column[OffsetDateTime]("requested_at")

  def * = (punterId, limitType, period, limit, effectiveFrom, requestedAt, id.?).mapTo[LimitChange]
}
