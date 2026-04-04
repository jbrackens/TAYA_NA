package phoenix.punters.cooloff

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.mappedColumnTypeForEnum
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.cooloff.PunterCoolOffRepository.coolOffCauseMapper
import phoenix.punters.domain.CoolOffCause

final class PunterCoolOffRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext) {
  import dbConfig.db

  private val coolOffQuery: TableQuery[CoolOffTable] = TableQuery[CoolOffTable]

  def save(punter: PunterCoolOff): Future[Unit] =
    db.run(coolOffQuery.insertOrUpdate(punter)).map(_ => ())

  def delete(punterId: PunterId): Future[Unit] =
    db.run(coolOffQuery.filter(_.punterId === punterId).delete).map(_ => ())

  def findElapsedBefore(date: OffsetDateTime): Future[List[PunterCoolOff]] =
    db.run(coolOffQuery.filter(_.coolOffEnd < date).result).map(_.toList)
}

private final class CoolOffTable(tag: Tag) extends Table[PunterCoolOff](tag, "punter_cool_offs") {
  def punterId = column[PunterId]("punter_id", O.PrimaryKey)
  def coolOffStart = column[OffsetDateTime]("cool_off_start")
  def coolOffEnd = column[OffsetDateTime]("cool_off_end")
  def coolOffCause = column[CoolOffCause]("cool_off_cause")

  def * = (punterId, coolOffStart, coolOffEnd, coolOffCause).mapTo[PunterCoolOff]
}

object PunterCoolOffRepository {

  implicit val coolOffCauseMapper: BaseColumnType[CoolOffCause] = mappedColumnTypeForEnum(CoolOffCause)
}

final case class PunterCoolOff(
    punterId: PunterId,
    coolOffStart: OffsetDateTime,
    coolOffEnd: OffsetDateTime,
    coolOffCause: CoolOffCause)
