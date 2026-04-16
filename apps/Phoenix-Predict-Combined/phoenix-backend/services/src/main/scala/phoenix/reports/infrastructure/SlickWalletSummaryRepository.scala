package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.EitherT
import cats.syntax.applicativeError._
import slick.basic.DatabaseConfig
import slick.dbio.DBIOAction
import slick.jdbc.JdbcProfile
import slick.lifted.PrimaryKey
import slick.lifted.ProvenShape
import slick.lifted.Tag

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.persistence.DBUtils
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.PunterWalletAlreadyExist
import phoenix.reports.domain.PunterWalletNotFound
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.wallets.Adjustments
import phoenix.reports.domain.model.wallets.DailyBalance
import phoenix.reports.domain.model.wallets.DailyWalletSummary
import phoenix.reports.domain.model.wallets.Deposits
import phoenix.reports.domain.model.wallets.Lifetime
import phoenix.reports.domain.model.wallets.Turnover
import phoenix.reports.domain.model.wallets.Withdrawals
import phoenix.wallets.WalletsBoundedContextProtocol
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction

final class SlickWalletSummaryRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)
    extends WalletSummaryRepository {

  import dbConfig.db

  override def createWallet(
      punterId: PunterId,
      balance: WalletsBoundedContextProtocol.Balance,
      createdAt: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, PunterWalletAlreadyExist, Unit] = {
    val enclosingDay = ReportingPeriod.enclosingDay(createdAt, clock)
    val openingBalance = MoneyAmount.zero
    val closingBalance = MoneyAmount(balance.realMoney.value.amount)
    val dailySummary = DailyWalletSummary.withBalance(openingBalance.get, closingBalance, punterId, enclosingDay)

    val createAttempt = for {
      punterAlreadyExists <- Queries.checkIfPunterExists(punterId).result
      _ <-
        if (punterAlreadyExists)
          DBIOAction.failed(PunterWalletAlreadyExist(punterId))
        else
          Queries.allSummaries += dailySummary
    } yield ()

    EitherT {
      db.run(createAttempt.transactionally).attemptNarrow[PunterWalletAlreadyExist]
    }
  }

  override def recordWalletTransaction(punterId: PunterId, transaction: Transaction)(implicit
      ec: ExecutionContext): EitherT[Future, PunterWalletNotFound, Unit] = {
    val reportingDay = ReportingPeriod.enclosingDay(transaction.timestamp, clock)

    val givenDaySummary =
      Queries.punterActivityGivenDay(punterId, reportingDay).result.headOption

    val recordedTransaction = givenDaySummary.flatMap {
      case None =>
        for {
          previousSummary <-
            Queries
              .punterActivityBefore(punterId, reportingDay)
              .result
              .headOption
              .map(maybePrevious => maybePrevious.getOrElse { throw PunterWalletNotFound(punterId) })
          recorded = DailyWalletSummary.fromPreviousDay(previousSummary, reportingDay).recordTransaction(transaction)
          _ <- Queries.allSummaries.insertOrUpdate(recorded)
        } yield ()

      case Some(summary) =>
        Queries.allSummaries.insertOrUpdate(summary.recordTransaction(transaction)).map(_ => ())
    }

    EitherT { db.run(recordedTransaction.transactionally).attemptNarrow[PunterWalletNotFound] }
  }

  override def getDailyWalletSummary(reportingDay: ReportingPeriod.Day): Source[DailyWalletSummary, NotUsed] = {
    val dailyPunterActivity = Queries.lastPunterActivity(asOf = reportingDay)

    DBUtils
      .streamingSource(db, dailyPunterActivity.result)
      .map(
        punterActivity =>
          if (punterActivity.day.periodStart < reportingDay.periodStart)
            DailyWalletSummary.fromPreviousDay(punterActivity, reportingDay)
          else
            punterActivity)
  }

  override def getDailyWalletSummaryByPeriod(period: ReportingPeriod): Source[DailyWalletSummary, NotUsed] = {
    val punterActivity = Queries.summariesForPeriod(asOf = period)
    DBUtils.streamingSource(db, punterActivity.result)
  }
}

private object Queries {
  val allSummaries: TableQuery[PunterDailyWalletSummaryTable] = TableQuery[PunterDailyWalletSummaryTable]

  def checkIfPunterExists(punterId: PunterId): Rep[Boolean] =
    allSummaries.filter(_.punterId === punterId).exists

  def punterActivityGivenDay(
      punterId: PunterId,
      day: ReportingPeriod.Day): Query[PunterDailyWalletSummaryTable, DailyWalletSummary, Seq] =
    allSummaries.filter(row => row.punterId === punterId && row.day === day.periodStart).take(1)

  def punterActivityBefore(
      punterId: PunterId,
      day: ReportingPeriod.Day): Query[PunterDailyWalletSummaryTable, DailyWalletSummary, Seq] =
    allSummaries.filter(row => row.punterId === punterId && row.day < day.periodStart).sortBy(_.day.desc).take(1)

  // the sortBy(_.punterId) is required by distinctOn postgres feature - it has to be exactly in this order
  def lastPunterActivity(asOf: ReportingPeriod.Day): Query[PunterDailyWalletSummaryTable, DailyWalletSummary, Seq] =
    allSummaries.filter(_.day <= asOf.periodStart).distinctOn(_.punterId).sortBy(_.day.desc).sortBy(_.punterId)

  def summariesForPeriod(asOf: ReportingPeriod): Query[PunterDailyWalletSummaryTable, DailyWalletSummary, Seq] =
    allSummaries.filter(summary => summary.day >= asOf.periodStart && summary.day < asOf.periodEnd).sortBy(_.day.asc)
}

private final class PunterDailyWalletSummaryTable(tag: Tag)
    extends Table[DailyWalletSummary](tag, "reporting_punter_daily_wallet_summary") {

  type TableRow = (
      PunterId,
      OffsetDateTime,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount)

  def punterId: Rep[PunterId] = column[PunterId]("punter_id")
  def day: Rep[OffsetDateTime] = column[OffsetDateTime]("day")
  def deposits: Rep[MoneyAmount] = column[MoneyAmount]("deposits")
  def confirmedWithdrawals: Rep[MoneyAmount] = column[MoneyAmount]("confirmed_withdrawals")
  def cancelledWithdrawals: Rep[MoneyAmount] = column[MoneyAmount]("cancelled_withdrawals")
  def pendingWithdrawals: Rep[MoneyAmount] = column[MoneyAmount]("pending_withdrawals")
  def initialBalance: Rep[MoneyAmount] = column[MoneyAmount]("initial_balance")
  def closingBalance: Rep[MoneyAmount] = column[MoneyAmount]("closing_balance")
  def lifetimeDeposits: Rep[MoneyAmount] = column[MoneyAmount]("lifetime_deposits")
  def lifetimeWithdrawals: Rep[MoneyAmount] = column[MoneyAmount]("lifetime_withdrawals")
  def turnover: Rep[MoneyAmount] = column[MoneyAmount]("turnover")
  def adjustments: Rep[MoneyAmount] = column[MoneyAmount]("adjustments")

  def primaryKey: PrimaryKey = primaryKey("reporting_punter_daily_wallet_summary_pkey", (punterId, day))

  override def * : ProvenShape[DailyWalletSummary] =
    (
      punterId,
      day,
      deposits,
      confirmedWithdrawals,
      cancelledWithdrawals,
      pendingWithdrawals,
      adjustments,
      initialBalance,
      closingBalance,
      lifetimeDeposits,
      lifetimeWithdrawals,
      turnover) <> (fromTableRow, toTableRow)

  private def toTableRow(summary: DailyWalletSummary): Option[TableRow] =
    Some(
      (
        summary.punterId,
        summary.day.periodStart,
        summary.deposits.total,
        summary.withdrawals.confirmed,
        summary.withdrawals.cancelled,
        summary.withdrawals.pending,
        summary.adjustments.total,
        summary.balance.opening,
        summary.balance.closing,
        summary.lifetime.deposits,
        summary.lifetime.withdrawals,
        summary.turnover.total))

  private def fromTableRow(row: TableRow): DailyWalletSummary =
    row match {
      case (
            punterId,
            activityDay,
            deposits,
            confirmedWithdrawals,
            cancelledWithdrawals,
            pendingWithdrawals,
            adjustments,
            openingBalance,
            closingBalance,
            lifetimeDeposits,
            lifetimeWithdrawals,
            turnover) =>
        DailyWalletSummary(
          punterId,
          ReportingPeriod.fromStartOfDayUnsafe(activityDay),
          Deposits(deposits),
          Withdrawals(confirmedWithdrawals, cancelledWithdrawals, pendingWithdrawals),
          Adjustments(adjustments),
          DailyBalance(openingBalance, closingBalance),
          Lifetime(lifetimeDeposits, lifetimeWithdrawals),
          Turnover(turnover))
    }
}
