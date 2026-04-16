package phoenix.reports.infrastructure

import phoenix.core.currency.MoneyAmount
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.moneyAmountTypeMapper
import phoenix.reports.domain.model.bets.NormalizedStake

object ReportsDomainMappers {
  implicit val normalizedStakeMapper: BaseColumnType[NormalizedStake] =
    MappedColumnType.base[NormalizedStake, MoneyAmount](_.value, raw => NormalizedStake(raw))
}
