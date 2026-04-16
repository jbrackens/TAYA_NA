package phoenix.punters.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

import phoenix.punters.PunterEntity.PunterId

trait PunterDeviceFingerprintsRepository {
  def insert(punterId: PunterId, deviceFingerprint: DeviceFingerprint): Future[Unit]

  def findPunterDeviceFingerprints(
      startDateTime: OffsetDateTime,
      endDateTime: OffsetDateTime): Future[Seq[PunterDeviceFingerprint]]
}

final case class PunterDeviceFingerprint(
    punterId: PunterId,
    timestamp: OffsetDateTime,
    visitorId: VisitorId,
    confidence: Confidence)
