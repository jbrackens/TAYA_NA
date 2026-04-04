package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.EitherT

import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.PunterWalletAlreadyExist
import phoenix.reports.domain.PunterWalletNotFound
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.wallets.DailyWalletSummary
import phoenix.wallets.WalletsBoundedContextProtocol
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction

final class InMemoryWalletSummaryRepository(clock: Clock) extends WalletSummaryRepository {
  var summaries: List[DailyWalletSummary] = List.empty

  override def createWallet(
      punterId: PunterId,
      balance: WalletsBoundedContextProtocol.Balance,
      createdAt: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, PunterWalletAlreadyExist, Unit] = {
    summaries.find(_.punterId == punterId) match {
      case Some(_) => EitherT.leftT(PunterWalletAlreadyExist(punterId))
      case None =>
        EitherT.safeRightT {
          val today = ReportingPeriod.enclosingDay(createdAt, clock)
          val initialBalance = MoneyAmount.zero.get
          val closingBalance = MoneyAmount(balance.realMoney.value.amount)
          upsert(DailyWalletSummary.withBalance(initialBalance, closingBalance, punterId, today))
        }
    }
  }

  override def recordWalletTransaction(punterId: PunterId, transaction: Transaction)(implicit
      ec: ExecutionContext): EitherT[Future, PunterWalletNotFound, Unit] = {
    val transactionDay = ReportingPeriod.enclosingDay(transaction.timestamp, clock)
    findCurrentDay(punterId, transactionDay) match {
      case Some(currentDay) =>
        val withTransaction = currentDay.recordTransaction(transaction)
        EitherT.safeRightT(upsert(withTransaction))
      case None =>
        findPreviousDay(punterId, transactionDay) match {
          case Some(previous) =>
            val newEntry = DailyWalletSummary.fromPreviousDay(previous, transactionDay).recordTransaction(transaction)
            EitherT.safeRightT(upsert(newEntry))
          case None =>
            EitherT.leftT(PunterWalletNotFound(punterId))
        }
    }
  }

  override def getDailyWalletSummary(day: ReportingPeriod.Day): Source[DailyWalletSummary, NotUsed] = {
    val allPunters = summaries.map(_.punterId).toSet
    val dailyPunterWallet = allPunters.flatMap { punterId =>
      val currentDay = findCurrentDay(punterId, day)
      currentDay.orElse(
        findPreviousDay(punterId, day).map(previousDay => DailyWalletSummary.fromPreviousDay(previousDay, day)))
    }
    Source(dailyPunterWallet)
  }

  override def getDailyWalletSummaryByPeriod(period: ReportingPeriod): Source[DailyWalletSummary, NotUsed] = {
    val allPunters = summaries.map(_.punterId).toSet
    Source(allPunters.map(punterId => findAllWithinPeriod(punterId, period)).flatten)
  }

  private def upsert(summary: DailyWalletSummary): Unit =
    summaries =
      summaries.filterNot(s => s.punterId == summary.punterId && s.day == summary.day) :+ summary

  private def findCurrentDay(punterId: PunterId, day: ReportingPeriod.Day): Option[DailyWalletSummary] =
    summaries.find(summary => summary.punterId == punterId && summary.day == day)

  private def findPreviousDay(punterId: PunterId, day: ReportingPeriod.Day): Option[DailyWalletSummary] =
    summaries.filter(summary => summary.punterId == punterId && summary.day.periodStart < day.periodStart).lastOption

  private def findAllWithinPeriod(punterId: PunterId, period: ReportingPeriod): List[DailyWalletSummary] =
    summaries
      .filter(s =>
        (s.punterId == punterId) && (s.day.periodStart >= period.periodStart) && (s.day.periodStart < period.periodEnd))
      .sortBy(_.day.periodStart)
}
