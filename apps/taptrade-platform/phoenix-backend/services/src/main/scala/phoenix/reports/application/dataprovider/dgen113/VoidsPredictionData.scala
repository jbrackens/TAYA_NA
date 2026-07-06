package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.instances.future._
import cats.syntax.traverse._

import phoenix.punters.PunterEntity.PunterId
import phoenix.prediction.infrastructure.PredictionOrderContextView
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.http.PredictionMarketView
import phoenix.prediction.infrastructure.http.PredictionOrderView
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Voids.PredictionVoidsRow

final class VoidsPredictionData(
    predictionReadModels: PredictionQueryService,
    puntersFinder: PuntersFinder)(implicit ec: ExecutionContext)
    extends ReportDataProvider[PredictionVoidsRow] {

  override protected def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PredictionVoidsRow]] =
    for {
      voidedOrders <- predictionReadModels.listAllOrders(status = Some("voided"))
      contexts <- predictionReadModels.predictionContextsForOrderIds(voidedOrders.map(_.orderId).toSet)
      marketViews <- predictionReadModels
        .listMarkets()
        .map(markets => markets.map(market => market.marketId -> market).toMap)
      rows <- voidedOrders.toList
        .filter(order => within(reportingPeriod, settledAt(order, contexts.get(order.orderId))))
        .traverse(order => buildRow(reportingPeriod, order, contexts.get(order.orderId), marketViews.get(order.marketId)))
    } yield rows.sortBy(row => (row.transactionTime.value.toInstant, row.orderId.value))

  private def buildRow(
      reportingPeriod: ReportingPeriod,
      order: PredictionOrderView,
      context: Option[PredictionOrderContextView],
      marketView: Option[PredictionMarketView]): Future[PredictionVoidsRow] =
    puntersFinder.find(PunterId(order.punterId)).map { punterProfile =>
      PredictionVoidsRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        transactionTime = TimeField(settledAt(order, context)),
        patronId = PatronIdField(PunterId(order.punterId)),
        accountDesignation = AccountDesignationField(punterProfile.designation()),
        orderId = StringField(order.orderId),
        issuanceDateTime = DateTimeField(OffsetDateTime.parse(order.createdAt)),
        marketCategory = StringField(order.categoryLabel),
        marketTitle = StringField(order.marketTitle),
        marketCloseDate = OptionalField(marketView.map(market => DateTimeField(OffsetDateTime.parse(market.closesAt)))),
        position = StringField(order.outcomeLabel),
        stakeAmount = MoneyField(order.stakeUsd),
        employeeNameSystemIdentifier = StringField(context.flatMap(_.settlementActor).filter(_.trim.nonEmpty).getOrElse("system")),
        reasonForVoid = StringField(context.flatMap(_.settlementReason).filter(_.trim.nonEmpty).getOrElse("Voided")))
    }

  private def settledAt(order: PredictionOrderView, context: Option[PredictionOrderContextView]): OffsetDateTime =
    context.flatMap(_.settledAt).map(OffsetDateTime.parse).getOrElse(OffsetDateTime.parse(order.updatedAt))

  private def within(reportingPeriod: ReportingPeriod, timestamp: OffsetDateTime): Boolean =
    !timestamp.isBefore(reportingPeriod.periodStart) && timestamp.isBefore(reportingPeriod.periodEnd)
}
