package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.Clock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.DeceasedPunters.DeceasedPunterInformation
import phoenix.reports.domain.DeceasedPuntersRepository

final class SlickDeceasedPuntersRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)(implicit
    ec: ExecutionContext)
    extends DeceasedPuntersRepository {
  import dbConfig.db

  private val deceasedPunters: TableQuery[DeceasedPuntersTable] = TableQuery[DeceasedPuntersTable]

  override def save(
      punterId: PunterId,
      suspendedAt: OffsetDateTime,
      clientIp: Option[IpAddress],
      device: Option[Device]): Future[Unit] =
    db.run(
      deceasedPunters += DeceasedPunterEntry(punterId, suspendedAt, clientIp, device, clock.currentOffsetDateTime()))
      .map(_ => ())

  override def getAllDeceasedPunters(): Future[Seq[DeceasedPunterInformation]] =
    db.run(deceasedPunters.result).map(_.map(_.toDeceasedPunterInformation))

  override def getDeceasedPuntersForPeriod(
      periodStart: OffsetDateTime,
      periodEnd: OffsetDateTime): Future[Seq[DeceasedPunterInformation]] = {
    db.run(deceasedPunters.filter(t => t.suspendedAt >= periodStart && t.suspendedAt < periodEnd).result)
      .map(_.map(_.toDeceasedPunterInformation))
  }
}

private final case class DeceasedPunterEntry(
    punterId: PunterId,
    suspendedAt: OffsetDateTime,
    clientIp: Option[IpAddress],
    device: Option[Device],
    createdAt: OffsetDateTime) {
  def toDeceasedPunterInformation = {
    DeceasedPunterInformation(punterId = punterId, suspendedAt = suspendedAt, clientIp = clientIp, device = device)
  }
}

private final class DeceasedPuntersTable(tag: Tag)
    extends Table[DeceasedPunterEntry](tag, "reporting_deceased_punters") {
  type TableRow = (PunterId, OffsetDateTime)

  def punterId = column[PunterId]("punter_id", O.PrimaryKey)
  def suspendedAt = column[OffsetDateTime]("suspended_at")
  def clientIp = column[Option[IpAddress]]("client_ip")
  def device = column[Option[Device]]("device")
  def createdAt = column[OffsetDateTime]("created_at")

  def * =
    (punterId, suspendedAt, clientIp, device, createdAt) <> ({
      case (punterId, suspendedAt, clientIp, device, createdAt) =>
        DeceasedPunterEntry(punterId, suspendedAt, clientIp, device, createdAt)
    }, (entry: DeceasedPunterEntry) =>
      Some((entry.punterId, entry.suspendedAt, entry.clientIp, entry.device, entry.createdAt)))
}
