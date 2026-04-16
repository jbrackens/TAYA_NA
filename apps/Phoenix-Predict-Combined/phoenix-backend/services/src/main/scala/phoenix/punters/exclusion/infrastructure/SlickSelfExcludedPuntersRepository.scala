package phoenix.punters.exclusion.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import enumeratum.SlickEnumSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.exclusion.domain.SelfExcludedPunter
import phoenix.punters.exclusion.domain.SelfExcludedPuntersRepository

final class SlickSelfExcludedPuntersRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends SelfExcludedPuntersRepository {

  import dbConfig.db

  private val selfExcludedPunters: TableQuery[SelfExcludedPuntersTable] = TableQuery[SelfExcludedPuntersTable]

  override def upsert(excludedPunter: SelfExcludedPunter): Future[Unit] =
    db.run(selfExcludedPunters.insertOrUpdate(excludedPunter)).map(_ => ())

  override def delete(punterId: PunterId): Future[Unit] =
    db.run(selfExcludedPunters.filter(_.punterId === punterId).delete).map(_ => ())

  override def search(punterId: PunterId): Future[Option[SelfExcludedPunter]] =
    db.run(selfExcludedPunters.filter(_.punterId === punterId).result.headOption)

  override def searchExcludedAfter(lowerBoundInclusive: OffsetDateTime): Future[List[SelfExcludedPunter]] =
    db.run(
      selfExcludedPunters
        .filter(selfExcludedPunter => selfExcludedPunter.excludedAt >= lowerBoundInclusive)
        .sortBy(_.excludedAt)
        .result)
      .map(_.toList)
}

private final class SelfExcludedPuntersTable(tag: Tag)
    extends Table[SelfExcludedPunter](tag, _tableName = "self_excluded_punters") {
  import SlickMappers._

  def punterId: Rep[PunterId] = column[PunterId]("punter_id", O.PrimaryKey)
  def exclusionDuration: Rep[SelfExclusionDuration] = column[SelfExclusionDuration]("exclusion_duration")
  def excludedAt: Rep[OffsetDateTime] = column[OffsetDateTime]("excluded_at")
  def * : ProvenShape[SelfExcludedPunter] = (punterId, exclusionDuration, excludedAt).mapTo[SelfExcludedPunter]
}

private object SlickMappers extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile

  implicit val selfExclusionDurationMapper: BaseColumnType[SelfExclusionDuration] = mappedColumnTypeForEnum(
    SelfExclusionDuration)
}
