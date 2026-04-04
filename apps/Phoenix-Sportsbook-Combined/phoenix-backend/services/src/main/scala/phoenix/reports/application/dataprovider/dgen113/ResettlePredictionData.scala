package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.instances.future._
import cats.syntax.traverse._

import phoenix.punters.PunterEntity.PunterId
import phoenix.prediction.infrastructure.PredictionOrderContextView
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.http.PredictionOrderView
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Resettle.PredictionResettleRow

final class ResettlePredictionData(
    predictionReadModels: PredictionQueryService,
    puntersFinder: PuntersFinder)(implicit ec: ExecutionContext)
    extends ReportDataProvider[PredictionResettleRow] {

  override protected def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PredictionResettleRow]] =
    for {
      resettledOrders <- predictionReadModels.listAllOrders(status = Some("resettled"))
      contexts <- predictionReadModels.predictionContextsForOrderIds(resettledOrders.map(_.orderId).toSet)
      rows <- resettledOrders.toList
        .filter(order => within(reportingPeriod, resettlementTime(order, contexts.get(order.orderId))))
        .traverse(order => buildRow(reportingPeriod, order, contexts.get(order.orderId)))
    } yield rows.sortBy(row => (row.resettlementDateTime.value.toInstant, row.orderId.value))

  private def buildRow(
      reportingPeriod: ReportingPeriod,
      order: PredictionOrderView,
      context: Option[PredictionOrderContextView]): Future[PredictionResettleRow] =
    puntersFinder.find(PunterId(order.punterId)).map { punterProfile =>
      val unsettledAmount = context.flatMap(_.previousSettledAmountUsd).getOrElse(BigDecimal(0))
      val resettledAmount = currentSettledAmount(order, context)

      PredictionResettleRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        patronId = PatronIdField(PunterId(order.punterId)),
        accountDesignation = AccountDesignationField(punterProfile.designation()),
        orderId = StringField(order.orderId),
        marketCategory = StringField(order.categoryLabel),
        marketTitle = StringField(order.marketTitle),
        position = StringField(order.outcomeLabel),
        initialSettlementDateTime = DateTimeField(initialSettlementTime(order, context)),
        resettlementDateTime = DateTimeField(resettlementTime(order, context)),
        unsettledAmount = MoneyField(unsettledAmount),
        resettledAmount = MoneyField(resettledAmount),
        netAdjustment = MoneyField(resettledAmount - unsettledAmount))
    }

  private def initialSettlementTime(order: PredictionOrderView, context: Option[PredictionOrderContextView]): OffsetDateTime =
    context.flatMap(_.previousSettledAt).map(OffsetDateTime.parse).getOrElse(OffsetDateTime.parse(order.createdAt))

  private def resettlementTime(order: PredictionOrderView, context: Option[PredictionOrderContextView]): OffsetDateTime =
    context.flatMap(_.settledAt).map(OffsetDateTime.parse).getOrElse(OffsetDateTime.parse(order.updatedAt))

  private def currentSettledAmount(order: PredictionOrderView, context: Option[PredictionOrderContextView]): BigDecimal =
    context.flatMap(_.winningOutcomeId) match {
      case Some(winningOutcomeId) if winningOutcomeId == order.outcomeId => order.maxPayoutUsd
      case Some(_)                                                       => BigDecimal(0)
      case None                                                          => order.maxPayoutUsd
    }

  private def within(reportingPeriod: ReportingPeriod, timestamp: OffsetDateTime): Boolean =
    !timestamp.isBefore(reportingPeriod.periodStart) && timestamp.isBefore(reportingPeriod.periodEnd)
}
