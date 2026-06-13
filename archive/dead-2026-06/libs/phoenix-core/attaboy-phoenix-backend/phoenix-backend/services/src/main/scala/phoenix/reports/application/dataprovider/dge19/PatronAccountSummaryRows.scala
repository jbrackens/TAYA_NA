package phoenix.reports.application.dataprovider.dge19

import phoenix.core.currency.MoneyAmount
import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.PunterBettingSummary
import phoenix.reports.domain.model.punter.AccountDesignation
import phoenix.reports.domain.model.wallets.DailyWalletSummary
import phoenix.reports.domain.template.dge19.PatronAccountSummary.PatronAccountSummaryReportRow

private[dge19] object PatronAccountSummaryRows {

  def buildReportRow(
      reportingPeriod: ReportingPeriod,
      walletSummary: DailyWalletSummary,
      punterDesignation: AccountDesignation,
      bettingSummary: PunterBettingSummary,
      openedBets: MoneyAmount): PatronAccountSummaryReportRow =
    PatronAccountSummaryReportRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      patronId = PatronIdField(walletSummary.punterId),
      accountDesignation = AccountDesignationField(punterDesignation),
      openingBalance = MoneyField(walletSummary.balance.opening.amount),
      patronCashDeposits = MoneyField(walletSummary.deposits.total.amount),
      patronWithdrawals =
        MoneyField(walletSummary.withdrawals.confirmed.amount + walletSummary.withdrawals.pending.amount),
      patronCanceledWithdrawals = MoneyField(walletSummary.withdrawals.cancelled.amount),
      adjustments = MoneyField(walletSummary.adjustments.total.amount),
      netBonusMovement = notImplemented,
      transfersToSports = MoneyField(bettingSummary.betsPlaced),
      canceledSportWagers = MoneyField(bettingSummary.betsCancelled),
      voidSportWager = MoneyField(bettingSummary.betsVoided),
      resettledSportsWager = MoneyField(bettingSummary.betsResettled),
      transfersFromSports = MoneyField(bettingSummary.betsWon),
      endingSportsGameFunds = MoneyField(openedBets.amount),
      patronSportsWinLoss = MoneyField(bettingSummary.winLoss),
      federalTax = notImplemented,
      stateTax = notImplemented,
      closingBalance = MoneyField(walletSummary.balance.closing.amount))

  private lazy val notImplemented: MoneyField = MoneyField(0)
}
