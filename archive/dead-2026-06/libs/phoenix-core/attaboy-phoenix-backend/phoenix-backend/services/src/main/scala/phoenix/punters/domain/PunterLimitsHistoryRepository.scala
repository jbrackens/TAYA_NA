package phoenix.punters.domain

import java.time.OffsetDateTime

import scala.collection.immutable
import scala.concurrent.Future

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId

trait PunterLimitsHistoryRepository {
  def findLimits(pagination: Pagination, punterId: PunterId): Future[PaginatedResult[LimitChange]]

  def insert(session: LimitChange): Future[Unit]
}

final case class LimitChange(
    punterId: PunterId,
    limitType: ResponsibleGamblingLimitType,
    period: LimitPeriodType,
    limit: String,
    effectiveFrom: OffsetDateTime,
    requestedAt: OffsetDateTime,
    id: Option[Long] = None)

sealed trait ResponsibleGamblingLimitType extends EnumEntry with UpperSnakecase
object ResponsibleGamblingLimitType extends Enum[ResponsibleGamblingLimitType] {
  override def values: immutable.IndexedSeq[ResponsibleGamblingLimitType] = findValues

  final case object DepositAmount extends ResponsibleGamblingLimitType
  final case object StakeAmount extends ResponsibleGamblingLimitType
  final case object SessionTime extends ResponsibleGamblingLimitType
}
