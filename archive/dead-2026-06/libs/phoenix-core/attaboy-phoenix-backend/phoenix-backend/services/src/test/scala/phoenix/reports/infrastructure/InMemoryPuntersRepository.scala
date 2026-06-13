package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.OptionT

import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository

final class InMemoryPuntersRepository(var punters: List[PunterProfile] = List.empty)(implicit ec: ExecutionContext)
    extends PuntersRepository {
  override def upsert(profile: PunterProfile): Future[Unit] =
    Future { replace(profile) }

  override def setActivationPath(
      punterId: PunterId,
      activationPath: ActivationPath,
      verifiedAt: OffsetDateTime,
      verifiedBy: Option[AdminId]): Future[Unit] =
    Future {
      punters
        .find(_.punterId == punterId)
        .map(_.copy(activationPath = activationPath, verifiedAt = Some(verifiedAt), verifiedBy = verifiedBy))
        .map(replace)
      ()
    }

  override def find(punterId: PunterId): OptionT[Future, PunterProfile] =
    OptionT.fromOption[Future](punters.find(_.punterId == punterId))

  override def setSuspensionReason(punterId: PunterId, reason: String): Future[Unit] = {
    Future {
      punters.find(_.punterId == punterId).map(_.copy(suspensionReason = Some(reason))).map(replace)
      ()
    }
  }

  private def replace(profile: PunterProfile): Unit =
    punters = punters.filter(_.punterId != profile.punterId) :+ profile

  override def getManuallyVerifiedPunters(
      verifiedAfter: OffsetDateTime,
      verifiedBefore: OffsetDateTime): Future[Seq[PunterProfile]] =
    Future.successful(punters.filter(p =>
      (p.activationPath == ActivationPath.Manual && p.verifiedAt.exists(v =>
        v == verifiedAfter || v.isAfter(verifiedAfter))) && p.verifiedAt.exists(_.isBefore(verifiedBefore))))

}
