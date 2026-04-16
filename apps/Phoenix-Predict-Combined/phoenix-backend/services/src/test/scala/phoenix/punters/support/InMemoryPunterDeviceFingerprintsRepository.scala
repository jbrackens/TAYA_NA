package phoenix.punters.support

import java.time.OffsetDateTime

import scala.concurrent.Future
import scala.math.Ordering.Implicits._

import phoenix.core.Clock
import phoenix.punters.PunterEntity
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.PunterDeviceFingerprint
import phoenix.punters.domain.PunterDeviceFingerprintsRepository

class InMemoryPunterDeviceFingerprintsRepository(clock: Clock = Clock.utcClock)(
    var deviceFingerprints: List[PunterDeviceFingerprint] = List.empty)
    extends PunterDeviceFingerprintsRepository {

  override def insert(punterId: PunterEntity.PunterId, deviceFingerprint: DeviceFingerprint): Future[Unit] =
    Future.successful {
      deviceFingerprints = deviceFingerprints :+ PunterDeviceFingerprint(
          punterId,
          clock.currentOffsetDateTime(),
          deviceFingerprint.visitorId,
          deviceFingerprint.confidence)
    }

  def findPunterDeviceFingerprints(
      startDateTime: OffsetDateTime,
      endDateTime: OffsetDateTime): Future[Seq[PunterDeviceFingerprint]] = {
    Future.successful(deviceFingerprints.filter(f => f.timestamp >= startDateTime && f.timestamp < endDateTime))
  }

}
