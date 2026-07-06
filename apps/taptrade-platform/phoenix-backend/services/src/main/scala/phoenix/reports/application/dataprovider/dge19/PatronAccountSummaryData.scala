package phoenix.reports.application.dataprovider.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.Materializer
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import cats.kernel.Monoid

import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.application.OpenedBetsFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.OperatorBettingSummary
import phoenix.reports.domain.model.bets.PunterBettingSummary
import phoenix.reports.domain.model.punter.AccountDesignation
import phoenix.reports.domain.model.wallets.DailyWalletSummary
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.PatronAccountSummary.PatronAccountSummaryReportRow

final class PatronAccountSummaryData(
    betEvents: BetEventsRepository,
    betsFinder: OpenedBetsFinder,
    punterWallets: WalletSummaryRepository,
    puntersFinder: PuntersFinder,
    predictionSummaries: PredictionReportingSummaryProvider = PredictionReportingSummaryProvider.noop)(implicit
    ec: ExecutionContext,
    mat: Materializer)
    extends ReportDataProvider[PatronAccountSummaryReportRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PatronAccountSummaryReportRow]] =
    reportingPeriod match {
      case reportingDay: ReportingPeriod.Day =>
        for {
          bettingSummaries <- betEventsSummarizedByPunter(reportingDay)
          openedBets <- openedBetsByPunter(reportingDay)
          walletsWithDesignation <-
            punterWallets
              .getDailyWalletSummary(reportingDay)
              .mapAsync(10)(wallet =>
                puntersFinder.find(wallet.punterId).map(_.designation()).map(designation => (wallet, designation)))
              .runWith(Sink.seq)
          predictionSummariesByPunter <- predictionSummaries.summarizePunters(
            reportingDay,
            walletsWithDesignation.map(_._1.punterId).toSet)
          reportRows = walletsWithDesignation.map({
            case (wallet, designation) =>
              buildRow(reportingPeriod, wallet, designation, bettingSummaries, predictionSummariesByPunter, openedBets)
          })

        } yield reportRows
      // TODO (PHXD-2008): consider parametrize reports & data providers
      case other => Future.failed(new IllegalArgumentException(s"Unsupported period $other"))
    }

  private def betEventsSummarizedByPunter(day: ReportingPeriod.Day): Future[Map[PunterId, PunterBettingSummary]] = {
    betEvents
      .findEventsWithinPeriod(day)
      .via(reduceByPunter(punterLens = _.betData.punterId, mapper = OperatorBettingSummary.fromEvent))
      .runWith(Sink.seq)
      .map { pairs =>
        pairs.map {
          case (punterId, operatorSummary) => (punterId, operatorSummary.fromPunterPerspective)
        }.toMap
      }
  }

  private def openedBetsByPunter(asOf: ReportingPeriod): Future[Map[PunterId, MoneyAmount]] =
    betsFinder
      .findOpenBetsAsOf(asOf.periodEnd)
      .via(reduceByPunter[Bet, MoneyAmount](punterLens = _.punterId, mapper = _.stake.value))
      .runWith(Sink.seq)
      .map(_.toMap)

  private def buildRow(
      reportingPeriod: ReportingPeriod,
      punterWallet: DailyWalletSummary,
      designation: AccountDesignation,
      bettingSummaries: Map[PunterId, PunterBettingSummary],
      predictionSummariesByPunter: Map[PunterId, PredictionPunterReportSummary],
      openedBetsTotals: Map[PunterId, MoneyAmount]): PatronAccountSummaryReportRow = {
    val bettingSummary = bettingSummaries.getOrElse(punterWallet.punterId, PunterBettingSummary.empty)
    val predictionSummary =
      predictionSummariesByPunter.getOrElse(punterWallet.punterId, PredictionPunterReportSummary.empty)
    val openedBets = openedBetsTotals.getOrElse(punterWallet.punterId, MoneyAmount.zero.get)

    PatronAccountSummaryRows.buildReportRow(
      reportingPeriod,
      punterWallet,
      designation,
      bettingSummary,
      predictionSummary,
      openedBets)
  }

  private def reduceByPunter[In, Out: Monoid](
      punterLens: In => PunterId,
      mapper: In => Out): Flow[In, (PunterId, Out), NotUsed] = {
    val maxPuntersAllowed = 1000000

    Flow[In]
      .map(in => punterLens(in) -> mapper(in))
      .groupBy(maxSubstreams = maxPuntersAllowed, { case (punterId, _) => punterId })
      .fold(PunterAggregation.initial) { case (acc, (punterId, next)) => acc.merge(punterId, next) }
      .mergeSubstreams
      .flatMapConcat(aggregation => Source(aggregation.tupled.toList))
  }
}

private final case class PunterAggregation[T: Monoid](punter: Option[PunterId], value: T) {
  def merge(punterId: PunterId, next: T): PunterAggregation[T] =
    PunterAggregation(Some(punterId), Monoid[T].combine(value, next))

  def tupled: Option[(PunterId, T)] =
    for { punter <- punter } yield punter -> value
}
private object PunterAggregation {
  def initial[T: Monoid]: PunterAggregation[T] = PunterAggregation(punter = None, Monoid[T].empty)
}
