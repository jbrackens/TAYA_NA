package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.collection.mutable.ListBuffer
import scala.concurrent.Future

import phoenix.core.Clock
import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.DeceasedPunters.DeceasedPunterInformation
import phoenix.reports.domain.DeceasedPuntersRepository

final class InMemoryDeceasedPuntersRepository(clock: Clock = Clock.utcClock) extends DeceasedPuntersRepository {

  private case class Entry(createdAt: OffsetDateTime, information: DeceasedPunterInformation)

  private val deceasedPunters = ListBuffer.empty[Entry]

  override def save(
      punterId: PunterId,
      suspendedAt: OffsetDateTime,
      clientIp: Option[IpAddress],
      device: Option[Device]): Future[Unit] =
    Future.successful {
      deceasedPunters.addOne(
        Entry(clock.currentOffsetDateTime(), DeceasedPunterInformation(punterId, suspendedAt, clientIp, device)))
    }

  override def getAllDeceasedPunters(): Future[Seq[DeceasedPunterInformation]] =
    Future.successful(deceasedPunters.map(_.information).toSeq)

  override def getDeceasedPuntersForPeriod(
      periodStart: OffsetDateTime,
      periodEnd: OffsetDateTime): Future[Seq[DeceasedPunterInformation]] =
    Future.successful(
      deceasedPunters
        .filter(p =>
          (p.information.suspendedAt.isEqual(periodStart) || p.information.suspendedAt.isAfter(
            periodStart)) && p.information.suspendedAt.isBefore(periodEnd))
        .map(_.information)
        .toSeq)

}
