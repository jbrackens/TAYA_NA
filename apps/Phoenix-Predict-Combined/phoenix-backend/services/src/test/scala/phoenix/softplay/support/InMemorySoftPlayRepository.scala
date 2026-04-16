package phoenix.softplay.support

import java.time.OffsetDateTime

import scala.concurrent.Future

import phoenix.softplay.domain._

final class InMemorySoftPlayRepository() extends SoftPlayRepository {

  override def getSuccessfulRegistrationsCount(at: OffsetDateTime): Future[SuccessfulRegistrationsCount] =
    Future.successful(SuccessfulRegistrationsCount(0))

  override def getUnsuccessfulRegistrationsCount(at: OffsetDateTime): Future[UnsuccessfulRegistrationsCount] =
    Future.successful(UnsuccessfulRegistrationsCount(0))

  override def getPuntersWithDepositLimitCount(at: OffsetDateTime): Future[PuntersWithDepositLimitCount] =
    Future.successful(PuntersWithDepositLimitCount(0))

  override def getPuntersWithSpendLimitCount(at: OffsetDateTime): Future[PuntersWithSpendLimitCount] =
    Future.successful(PuntersWithSpendLimitCount(0))

  override def getExcludedPuntersCount(at: OffsetDateTime): Future[ExcludedPuntersCount] =
    Future.successful(ExcludedPuntersCount(0))

  override def getSuspendedPuntersCount(at: OffsetDateTime): Future[SuspendedPuntersCount] =
    Future.successful(SuspendedPuntersCount(0))
}
