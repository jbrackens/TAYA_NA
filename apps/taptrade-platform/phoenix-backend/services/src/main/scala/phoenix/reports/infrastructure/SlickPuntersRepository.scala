package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.OptionT
import enumeratum.SlickEnumSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery

import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository

private[reports] final class SlickPuntersRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit
    ec: ExecutionContext)
    extends PuntersRepository {
  import dbConfig.db
  import SlickPuntersMappers._

  private val allRows: TableQuery[PuntersTable] = TableQuery[PuntersTable]

  override def upsert(punterProfile: PunterProfile): Future[Unit] =
    db.run(allRows.insertOrUpdate(punterProfile)).map(_ => ())

  override def setActivationPath(
      punterId: PunterId,
      activationPath: ActivationPath,
      verifiedAt: OffsetDateTime,
      verifiedBy: Option[AdminId]): Future[Unit] =
    db.run(
      allRows
        .filter(_.punterId === punterId)
        .map(t => (t.activationPath, t.verifiedAt, t.verifiedBy))
        .update((activationPath, Some(verifiedAt), verifiedBy)))
      .map(_ => ())

  override def find(punterId: PunterId): OptionT[Future, PunterProfile] =
    OptionT(db.run(allRows.filter(_.punterId === punterId).result.headOption))

  override def setSuspensionReason(punterId: PunterId, reason: String): Future[Unit] = {
    db.run(allRows.filter(_.punterId === punterId).map(_.suspensionReason).update(Some(reason))).map(_ => ())
  }

  override def getManuallyVerifiedPunters(
      verifiedAfter: OffsetDateTime,
      verifiedBefore: OffsetDateTime): Future[Seq[PunterProfile]] = {
    db.run(allRows
      .filter(t =>
        (t.activationPath === (ActivationPath.Manual: ActivationPath)) && t.verifiedAt >= verifiedAfter && t.verifiedAt < verifiedBefore)
      .result)
  }
}

private class PuntersTable(tag: Tag) extends Table[PunterProfile](tag, "reporting_punters") {
  import SlickPuntersMappers._

  val punterId = column[PunterId]("punter_id", O.PrimaryKey)
  val punterName = column[String]("punter_name")
  val testAccount = column[Boolean]("test_account")
  val activationPath = column[ActivationPath]("activation_path")
  val suspensionReason = column[Option[String]]("suspension_reason")
  val verifiedAt = column[Option[OffsetDateTime]]("verified_at")
  val verifiedBy = column[Option[AdminId]]("verified_by")

  override def * : ProvenShape[PunterProfile] =
    (punterId, punterName, testAccount, activationPath, suspensionReason, verifiedAt, verifiedBy).mapTo[PunterProfile]
}

private object SlickPuntersMappers extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile

  implicit val activationPathMapper: BaseColumnType[ActivationPath] = mappedColumnTypeForEnum(ActivationPath)
}
