package phoenix.punters.exclusion.application

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._

import cats.data.EitherT
import cats.syntax.bifunctor._
import cats.syntax.traverse._

import phoenix.core.Clock
import phoenix.core.TimeUtils._
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.exclusion.domain.DocumentNumber
import phoenix.punters.exclusion.domain.DocumentType
import phoenix.punters.exclusion.domain.LicenseId
import phoenix.punters.exclusion.domain.SelfExcludedPunter
import phoenix.punters.exclusion.domain.SelfExcludedPunterReportData
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReport
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReportPublisher
import phoenix.punters.exclusion.domain.SelfExcludedPuntersRepository
import phoenix.punters.exclusion.domain.SkinId
import phoenix.punters.infrastructure.KeycloakHelpers

private[exclusion] final class ProduceSelfExcludedPuntersReport(
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    selfExcludedPuntersRepository: SelfExcludedPuntersRepository,
    selfExcludedPuntersReportPublisher: SelfExcludedPuntersReportPublisher,
    clock: Clock,
    licenseId: LicenseId,
    skinId: SkinId)(implicit ec: ExecutionContext) {

  def produceReport(): EitherT[Future, IndividualPunterError, Unit] = {
    val now = clock.currentOffsetDateTime()

    for {
      selfExcludedPunters <- findSelfExcludedPuntersForReport(now)
      puntersReportData <- obtainPuntersReportData(selfExcludedPunters)
      _ <- EitherT.liftF(
        selfExcludedPuntersReportPublisher.publish(
          SelfExcludedPuntersReport(reportGeneratedAt = now.toLocalDate, licenseId, puntersReportData)))
    } yield ()
  }

  private def findSelfExcludedPuntersForReport(
      now: OffsetDateTime): EitherT[Future, Nothing, List[SelfExcludedPunter]] = {
    val sevenDaysAgoAtBeginningOfDay = now.atBeginningOfDay() - 7.day
    EitherT.liftF(selfExcludedPuntersRepository.searchExcludedAfter(lowerBoundInclusive = sevenDaysAgoAtBeginningOfDay))
  }

  private def obtainPuntersReportData(selfExcludedPunters: List[SelfExcludedPunter])
      : EitherT[Future, IndividualPunterError, List[SelfExcludedPunterReportData]] =
    selfExcludedPunters.traverse(findDataForIndividualPunter)

  private def findDataForIndividualPunter(
      selfExcludedPunter: SelfExcludedPunter): EitherT[Future, IndividualPunterError, SelfExcludedPunterReportData] = {
    for {
      registeredUserAndPunter <- KeycloakHelpers.getRegisteredUserAndPunter[IndividualPunterError](
        authenticationRepository,
        puntersRepository,
        selfExcludedPunter.punterId,
        IndividualPunterError.RegisteredUserNotFound(selfExcludedPunter.punterId),
        IndividualPunterError.RegisteredUserNotFound(selfExcludedPunter.punterId))
      registeredUser = registeredUserAndPunter.registeredUser
      punter = registeredUserAndPunter.punter
      lastSignInData <-
        EitherT
          .fromOption[Future](
            registeredUser.lastSignIn,
            IndividualPunterError.RegisteredUserDidNotHaveLastSignInData(selfExcludedPunter.punterId))
          .leftWiden[IndividualPunterError]
      fullSsn <-
        EitherT
          .fromEither[Future](registeredUserAndPunter.punter.ssn)
          .leftMap[IndividualPunterError](_ => IndividualPunterError.SSNNotFound(selfExcludedPunter.punterId))
    } yield SelfExcludedPunterReportData(
      selfExcludedPunter.punterId,
      skinId,
      registeredUser.details.name,
      registeredUser.details.address,
      fullSsn,
      registeredUser.details.dateOfBirth,
      excludedAt = selfExcludedPunter.excludedAt,
      duration = selfExcludedPunter.exclusionDuration,
      lastSignInData = lastSignInData,
      documentType = DocumentType(punter.details.document.fold("SSN")(_.documentType.entryName)),
      documentNumber = DocumentNumber(punter.details.document.fold(fullSsn.value)(_.number.value)))
  }
}

private[exclusion] sealed trait IndividualPunterError
private[exclusion] object IndividualPunterError {
  final case class RegisteredUserNotFound(punterId: PunterId) extends IndividualPunterError
  final case class RegisteredUserDidNotHaveLastSignInData(punterId: PunterId) extends IndividualPunterError
  final case class SSNNotFound(punterId: PunterId) extends IndividualPunterError
}
