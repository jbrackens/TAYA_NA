package phoenix.softplay.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

trait SoftPlayRepository {

  // TODO (PHXD-2601): successful registrations retrieved from `punter_registration_data` table
  // we will need to introduce a `registered_at` column to record the date/time registration occured
  def getSuccessfulRegistrationsCount(at: OffsetDateTime): Future[SuccessfulRegistrationsCount]

  // TODO (PHXD-2601): unsuccessful registrations retrieved from `punter_registration_data` table
  // we will need to introduce a `registered_at` column to record the date/time registration occured
  def getUnsuccessfulRegistrationsCount(at: OffsetDateTime): Future[UnsuccessfulRegistrationsCount]

  // TODO (PHXD-2602): deposit limits retrieved from `punter_limits_history` table
  // we can use the `effective_from` data column along with `period_type` to know when the limit is applied
  def getPuntersWithDepositLimitCount(at: OffsetDateTime): Future[PuntersWithDepositLimitCount]

  // TODO (PHXD-2602): spend (stake) limits retrieved from `punter_limits_history` table
  // we can use the `effective_from` data column along with `period_type` to know when the limit is applied
  def getPuntersWithSpendLimitCount(at: OffsetDateTime): Future[PuntersWithSpendLimitCount]

  // TODO (PHXD-2604): excluded punters retrieved from `self_excluded_punters`
  // we can use the `excluded_at` column to know when the exclusion took place
  def getExcludedPuntersCount(at: OffsetDateTime): Future[ExcludedPuntersCount]

  // TODO (PHXD-2606): suspended users (cooling-off) retrieved from `punter_cool_offs`
  // we can use the `cool_off_start` and `cool_off_end` to know which cool-offs to count
  def getSuspendedPuntersCount(at: OffsetDateTime): Future[SuspendedPuntersCount]
}
