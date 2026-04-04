package phoenix.reports.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.PunterId

trait DeceasedPuntersRepository {

  import DeceasedPunters._

  def save(
      punterId: PunterId,
      suspendedAt: OffsetDateTime,
      clientIp: Option[IpAddress],
      device: Option[Device]): Future[Unit]

  def getAllDeceasedPunters(): Future[Seq[DeceasedPunterInformation]]
  def getDeceasedPuntersForPeriod(
      periodStart: OffsetDateTime,
      periodEnd: OffsetDateTime): Future[Seq[DeceasedPunterInformation]]
}

object DeceasedPunters {

  final case class DeceasedPunterInformation(
      punterId: PunterId,
      suspendedAt: OffsetDateTime,
      clientIp: Option[IpAddress],
      device: Option[Device])
}
