package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.instances.future._
import cats.syntax.traverse._

import phoenix.punters.PunterEntity.PunterId
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.http.PredictionMarketView
import phoenix.prediction.infrastructure.http.PredictionOrderView
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.SportsLiability.PredictionLiabilityRow

final class SportsLiabilityPredictionData(
    predictionReadModels: PredictionQueryService,
    puntersFinder: PuntersFinder)(implicit ec: ExecutionContext)
    extends ReportDataProvider[PredictionLiabilityRow] {

  override protected def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PredictionLiabilityRow]] =
    for {
      openOrders <- predictionReadModels.listAllOrders(status = Some("open"))
      relevantOrders = openOrders.filter(order =>
        OffsetDateTime.parse(order.createdAt).compareTo(reportingPeriod.periodEnd) <= 0)
      marketViews <- predictionReadModels
        .listMarkets()
        .map(markets => markets.map(market => market.marketId -> market).toMap)
      rows <- relevantOrders.toList.traverse(order => buildRow(reportingPeriod, order, marketViews.get(order.marketId)))
    } yield rows.sortBy(_.orderDateTime.value.toInstant)

  private def buildRow(
      reportingPeriod: ReportingPeriod,
      order: PredictionOrderView,
      marketView: Option[PredictionMarketView]): Future[PredictionLiabilityRow] =
    for {
      punterProfile <- puntersFinder.find(PunterId(order.punterId))
    } yield PredictionLiabilityRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      patronId = PatronIdField(PunterId(order.punterId)),
      accountDesignation = AccountDesignationField(punterProfile.designation()),
      orderId = StringField(order.orderId),
      marketCategory = StringField(order.categoryLabel),
      marketTitle = StringField(order.marketTitle),
      orderDateTime = DateTimeField(OffsetDateTime.parse(order.createdAt)),
      marketCloseDate = OptionalField(marketView.map(market => DateTimeField(OffsetDateTime.parse(market.closesAt)))),
      position = StringField(order.outcomeLabel),
      stakeAmount = MoneyField(order.stakeUsd),
      status = StringField(order.status))
}
