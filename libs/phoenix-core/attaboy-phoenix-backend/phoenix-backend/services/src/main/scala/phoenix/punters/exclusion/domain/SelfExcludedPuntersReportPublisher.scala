package phoenix.punters.exclusion.domain

import java.time.LocalDate
import java.time.OffsetDateTime

import scala.concurrent.Future

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.domain.Address
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.LastSignInData
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.SocialSecurityNumber.FullSSN

private[exclusion] trait SelfExcludedPuntersReportPublisher {
  def publish(report: SelfExcludedPuntersReport): Future[Unit]
}

private[exclusion] final case class SelfExcludedPuntersReport(
    reportGeneratedAt: LocalDate,
    licenseId: LicenseId,
    puntersData: List[SelfExcludedPunterReportData])

private[exclusion] final case class SelfExcludedPunterReportData(
    punterId: PunterId,
    skinId: SkinId,
    name: PersonalName,
    address: Address,
    ssn: FullSSN,
    dateOfBirth: DateOfBirth,
    excludedAt: OffsetDateTime,
    duration: SelfExclusionDuration,
    lastSignInData: LastSignInData,
    documentType: DocumentType,
    documentNumber: DocumentNumber)

final case class LicenseId(value: String)
final case class SkinId(value: String)
final case class DocumentType(value: String)
final case class DocumentNumber(value: String)
