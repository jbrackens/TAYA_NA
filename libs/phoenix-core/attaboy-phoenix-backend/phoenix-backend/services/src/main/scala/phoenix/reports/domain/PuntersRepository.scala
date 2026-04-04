package phoenix.reports.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

import cats.data.OptionT

import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.domain.model.punter.AccountDesignation

private[reports] trait PuntersRepository {
  def upsert(bet: PunterProfile): Future[Unit]
  def setActivationPath(
      punterId: PunterId,
      activationPath: ActivationPath,
      verifiedAt: OffsetDateTime,
      verifiedBy: Option[AdminId]): Future[Unit]
  def setSuspensionReason(punterId: PunterId, reason: String): Future[Unit]
  def find(betId: PunterId): OptionT[Future, PunterProfile]
  def getManuallyVerifiedPunters(
      verifiedAfter: OffsetDateTime,
      verifiedBefore: OffsetDateTime): Future[Seq[PunterProfile]]
}

private[reports] final case class PunterProfile(
    punterId: PunterId,
    punterName: String,
    isTestAccount: Boolean,
    activationPath: ActivationPath,
    suspensionReason: Option[String],
    verifiedAt: Option[OffsetDateTime],
    verifiedBy: Option[AdminId]) {
  def designation(): AccountDesignation =
    if (isTestAccount) AccountDesignation.TestAccount else AccountDesignation.RealAccount
}
