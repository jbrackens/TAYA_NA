package phoenix.punters.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery
import slick.lifted.Tag

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper
import phoenix.punters.PunterEntity
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.PunterCoolOffEntry
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.infrastructure.PunterDomainMappers.coolOffCauseMapper

final class SlickPunterCoolOffsHistoryRepository(dbConfig: DatabaseConfig[JdbcProfile])
    extends PunterCoolOffsHistoryRepository {

  import dbConfig.db
  private val punterCoolOffs: TableQuery[CoolOffsHistoryTable] = TableQuery[CoolOffsHistoryTable]

  override def findCoolOffs(pagination: Pagination, punterId: PunterEntity.PunterId)(implicit
      ec: ExecutionContext): Future[PaginatedResult[PunterCoolOffEntry]] = {
    val coolOffs = punterCoolOffs.filter(_.punterId === punterId).sortBy(_.coolOffStart.desc)
    val dbQuery = for {
      entries <- coolOffs.drop(pagination.offset).take(pagination.itemsPerPage).result
      totalCount <- coolOffs.length.result
    } yield PaginatedResult(entries.map(_.punterCoolOffEntry), totalCount, pagination)
    db.run(dbQuery)
  }

  override def insert(entry: PunterCoolOffEntry)(implicit ec: ExecutionContext): Future[Unit] =
    db.run(punterCoolOffs += PunterCoolOffEntryWithId(entry, None)).map(_ => ())
}

private final case class PunterCoolOffEntryWithId(punterCoolOffEntry: PunterCoolOffEntry, id: Option[Long])

private final class CoolOffsHistoryTable(tag: Tag)
    extends Table[PunterCoolOffEntryWithId](tag, "punter_cool_offs_history") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def punterId = column[PunterEntity.PunterId]("punter_id")
  def coolOffStart = column[OffsetDateTime]("cool_off_start")
  def coolOffEnd = column[OffsetDateTime]("cool_off_end")
  def coolOffCause = column[CoolOffCause]("cool_off_cause")

  def * = (entry, id.?).mapTo[PunterCoolOffEntryWithId]
  def entry = (punterId, coolOffStart, coolOffEnd, coolOffCause).mapTo[PunterCoolOffEntry]
}
