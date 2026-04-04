package phoenix.reports.domain.model.wallets

import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterEntity.PunterId

final case class PeriodicWalletSummary(
    punterId: PunterId,
    deposits: MoneyAmount,
    withdrawals: MoneyAmount,
    lifetimeDeposits: MoneyAmount,
    lifetimeWithdrawals: MoneyAmount,
    turnover: MoneyAmount)

object PeriodicWalletSummary {
  def apply(punterSummaries: Seq[DailyWalletSummary]): Seq[PeriodicWalletSummary] = {
    val depositingPuntersSummaries =
      punterSummaries.groupBy(_.punterId).filter(_._2.map(_.hasDeposits()).reduce(_ || _)).toSeq
    depositingPuntersSummaries.map {
      case (punterId, punterSummaries) =>
        punterSummaries
          .sortBy(_.day.periodStart)
          .foldLeft[PeriodicWalletSummary](empty(punterId))({
            case (acc, summary) =>
              acc.copy(
                deposits = acc.deposits + summary.deposits.total,
                withdrawals = acc.withdrawals + summary.withdrawals.confirmed,
                lifetimeDeposits = summary.lifetime.deposits,
                lifetimeWithdrawals = summary.lifetime.withdrawals,
                turnover = summary.turnover.total)
          })
    }
  }

  private def empty(punterId: PunterId): PeriodicWalletSummary =
    PeriodicWalletSummary(punterId, MoneyAmount(0), MoneyAmount(0), MoneyAmount(0), MoneyAmount(0), MoneyAmount(0))
}
