package phoenix.punters.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery

import phoenix.core.Clock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.Confidence
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.PunterDeviceFingerprint
import phoenix.punters.domain.PunterDeviceFingerprintsRepository
import phoenix.punters.domain.VisitorId
import phoenix.punters.infrastructure.PunterDomainMappers.confidenceTypeMapper
import phoenix.punters.infrastructure.PunterDomainMappers.visitorIdTypeMapper

class SlickPunterDeviceFingerprintsRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)(implicit
    ec: ExecutionContext)
    extends PunterDeviceFingerprintsRepository {
  import dbConfig.db

  private val punterDeviceFingerprints: TableQuery[PunterDeviceFingerprintsTable] =
    TableQuery[PunterDeviceFingerprintsTable]

  def insert(punterId: PunterId, deviceFingerprint: DeviceFingerprint): Future[Unit] = {
    val insertStatement = punterDeviceFingerprints += PunterDeviceFingerprint(
          punterId,
          clock.currentOffsetDateTime(),
          deviceFingerprint.visitorId,
          deviceFingerprint.confidence)
    db.run(insertStatement).map(_ => ())
  }

  def findPunterDeviceFingerprints(
      startDateTime: OffsetDateTime,
      endDateTime: OffsetDateTime): Future[Seq[PunterDeviceFingerprint]] =
    db.run(punterDeviceFingerprints.filter { fingerprint =>
      fingerprint.timestamp >= startDateTime && fingerprint.timestamp < endDateTime
    }.result)

}

private final class PunterDeviceFingerprintsTable(tag: Tag)
    extends Table[PunterDeviceFingerprint](tag, "punter_device_fingerprints") {
  type TableRow = (PunterId, OffsetDateTime, VisitorId, Confidence)

  def punterId: Rep[PunterId] = column[PunterId]("punter_id")
  def timestamp: Rep[OffsetDateTime] = column[OffsetDateTime]("timestamp")
  def visitorId: Rep[VisitorId] = column[VisitorId]("visitor_id")
  def confidence: Rep[Confidence] = column[Confidence]("confidence")

  override def * : ProvenShape[PunterDeviceFingerprint] =
    (punterId, timestamp, visitorId, confidence) <> (fromTableRow, toTableRow)

  private def toTableRow(punterDeviceFingerprint: PunterDeviceFingerprint): Option[TableRow] = {
    Some(
      (
        punterDeviceFingerprint.punterId,
        punterDeviceFingerprint.timestamp,
        punterDeviceFingerprint.visitorId,
        punterDeviceFingerprint.confidence))
  }

  private def fromTableRow(row: TableRow): PunterDeviceFingerprint =
    row match {
      case (punterId, timestamp, visitorId, deviceInformation) =>
        PunterDeviceFingerprint(punterId, timestamp, visitorId, deviceInformation)
    }
}
