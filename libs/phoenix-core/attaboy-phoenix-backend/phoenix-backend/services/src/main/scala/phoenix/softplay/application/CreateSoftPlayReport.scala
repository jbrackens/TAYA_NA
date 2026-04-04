package phoenix.softplay.application

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.softplay.domain.SoftPlayReport
import phoenix.softplay.domain.SoftPlayRepository

final class CreateSoftPlayReport(softPlayRepository: SoftPlayRepository)(implicit ec: ExecutionContext) {

  def createReport(at: OffsetDateTime): Future[SoftPlayReport] =
    for {
      successfulRegistrationsCount <- softPlayRepository.getSuccessfulRegistrationsCount(at)
      unsuccessfulRegistrationsCount <- softPlayRepository.getUnsuccessfulRegistrationsCount(at)
      puntersWithDepositLimitCount <- softPlayRepository.getPuntersWithDepositLimitCount(at)
      puntersWithSpendLimitCount <- softPlayRepository.getPuntersWithSpendLimitCount(at)
      excludedPuntersCount <- softPlayRepository.getExcludedPuntersCount(at)
      suspendedPuntersCount <- softPlayRepository.getSuspendedPuntersCount(at)
    } yield SoftPlayReport(
      successfulRegistrationsCount,
      unsuccessfulRegistrationsCount,
      puntersWithDepositLimitCount,
      puntersWithSpendLimitCount,
      excludedPuntersCount,
      suspendedPuntersCount)

}
