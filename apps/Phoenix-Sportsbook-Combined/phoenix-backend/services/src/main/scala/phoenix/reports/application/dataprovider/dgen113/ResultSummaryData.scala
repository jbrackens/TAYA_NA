package phoenix.reports.application.dataprovider.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

import akka.NotUsed
import akka.stream.FlowShape
import akka.stream.Materializer
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Merge
import akka.stream.scaladsl.Partition
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import com.google.common.collect.BiMap
import com.google.common.collect.HashBiMap

import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.SportDisciplineField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.OperatorBettingSummary
import phoenix.reports.domain.model.markets.SportDiscipline
import phoenix.reports.domain.model.markets.SportDiscipline.Other
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.ResultSummary.ResultSummaryRow

final class ResultSummaryData(betEventsRepository: BetEventsRepository)(implicit
    mat: Materializer,
    ec: ExecutionContext)
    extends ReportDataProvider[ResultSummaryRow] {

  val requiredDisciplinesIndex: BiMap[SportDiscipline, Int] = HashBiMap.create(
    Map(
      SportDiscipline.AmericanFootball -> 0,
      SportDiscipline.Baseball -> 1,
      SportDiscipline.Basketball -> 2,
      SportDiscipline.Boxing -> 3,
      SportDiscipline.Football -> 4,
      SportDiscipline.Golf -> 5,
      SportDiscipline.MotorSport -> 6,
      SportDiscipline.Tennis -> 7,
      SportDiscipline.Other -> 8).asJava)

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[ResultSummaryRow]] = {
    val betsForDay = betEventsRepository.findEventsWithinPeriod(reportingPeriod)
    val discipline2Summary = sumEachDiscipline(betsForDay)

    discipline2Summary.map(summaries => {
      val requiredDisciplinesSummary = zipRequiredWithSummaries(summaries)

      requiredDisciplinesSummary.map(data => buildReportRow(reportingPeriod, data.discipline, data.summary))
    })
  }

  private def zipRequiredWithSummaries(
      summaries: Map[SportDiscipline, OperatorBettingSummary]): Seq[DisciplineSummary] = {
    val disciplinesOrdered: Seq[SportDiscipline] = requiredDisciplinesIndex.asScala.toSeq.sortBy(_._2).map(_._1)
    disciplinesOrdered.map(discipline =>
      DisciplineSummary(discipline, summaries.getOrElse(discipline, OperatorBettingSummary.empty)))
  }

  /**
   * Report changes the sign in few columns compared to Summary
   * (@see phoenix.reports.domain.model.bets.BettingSummaryBuilder#add(phoenix.reports.domain.model.bets.BetEvent)
   */
  private def buildReportRow(
      reportingPeriod: ReportingPeriod,
      eventType: SportDiscipline,
      summary: OperatorBettingSummary) = {
    ResultSummaryRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      eventType = SportDisciplineField(eventType),
      ticketBetSales = MoneyField(summary.betsSold.toDouble),
      ticketsBetsPaid = MoneyField(summary.betsPaid.toDouble),
      ticketsBetsCancelled = MoneyField(summary.betsCancelled.toDouble),
      ticketsBetsVoided = MoneyField(summary.betsVoided.toDouble),
      resettledBetAdjustment = MoneyField(summary.betsResettled.toDouble),
      netSportsPoolGrossRevenue = MoneyField(summary.revenue.toDouble))
  }

  /**
   * <b>WARN!</b> It's better to always use `def` otherwise stream will get reused and will cause problems eg when working with aggregate state.
   */
  private def sumEachDiscipline(
      bets: Source[BetEvent, NotUsed]): Future[Map[SportDiscipline, OperatorBettingSummary]] = {
    bets
      .via(sumByDiscipline)
      .runWith(Sink.collection)
      .map(_.map(disciplineSummary => (disciplineSummary.discipline, disciplineSummary.summary)).toMap)
  }

  private def sumByDiscipline: Flow[BetEvent, DisciplineSummary, NotUsed] =
    Flow.fromGraph(GraphDSL.create() { implicit b =>
      import GraphDSL.Implicits._

      val otherDisciplinesIndex = requiredDisciplinesIndex.get(Other)

      def findGroup(event: BetEvent): Int = {
        requiredDisciplinesIndex.getOrDefault(event.discipline, otherDisciplinesIndex)
      }

      val groupsCount = requiredDisciplinesIndex.size

      val groupByDiscipline = b.add(Partition[BetEvent](groupsCount, event => findGroup(event)))
      val merge = b.add(Merge[DisciplineSummary](groupsCount))

      for (groupIndex <- 0 until groupsCount) {
        val discipline = requiredDisciplinesIndex.inverse().get(groupIndex)
        groupByDiscipline ~> sumOneDiscipline.map(DisciplineSummary(discipline, _)).async ~> merge
      }

      FlowShape(groupByDiscipline.in, merge.out)
    })

  private def sumOneDiscipline: Flow[BetEvent, OperatorBettingSummary, NotUsed] =
    Flow[BetEvent].fold(OperatorBettingSummary.empty)((summaryBuilder, event) => summaryBuilder.add(event))

  private case class DisciplineSummary(discipline: SportDiscipline, summary: OperatorBettingSummary)

}
