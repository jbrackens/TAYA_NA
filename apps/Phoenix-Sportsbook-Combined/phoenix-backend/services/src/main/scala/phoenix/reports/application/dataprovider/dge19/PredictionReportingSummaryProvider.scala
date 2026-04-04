package phoenix.reports.application.dataprovider.dge19

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.currency.MoneyAmount
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.http.PredictionOrderView
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.model.ReportingPeriod

private[reports] trait PredictionReportingSummaryProvider {
  def summarizePunters(reportingPeriod: ReportingPeriod, punterIds: Set[PunterId])(implicit
      ec: ExecutionContext): Future[Map[PunterId, PredictionPunterReportSummary]]

  def summarizeMarkets(reportingPeriod: ReportingPeriod)(implicit
      ec: ExecutionContext): Future[Seq[PredictionMarketReportSummary]]

  def summarizeResultCategories(reportingPeriod: ReportingPeriod)(implicit
      ec: ExecutionContext): Future[Seq[PredictionResultCategorySummary]]

  def summarizeResultDetails(reportingPeriod: ReportingPeriod)(implicit
      ec: ExecutionContext): Future[Seq[PredictionResultDetailSummary]]
}

private[reports] final case class PredictionPunterReportSummary(
    transfersToPrediction: MoneyAmount,
    cancelledPredictionOrders: MoneyAmount,
    transfersFromPrediction: MoneyAmount,
    endingPredictionExposure: MoneyAmount,
    patronPredictionWinLoss: MoneyAmount)

private[reports] object PredictionPunterReportSummary {
  val empty: PredictionPunterReportSummary =
    PredictionPunterReportSummary(
      transfersToPrediction = MoneyAmount.zero.get,
      cancelledPredictionOrders = MoneyAmount.zero.get,
      transfersFromPrediction = MoneyAmount.zero.get,
      endingPredictionExposure = MoneyAmount.zero.get,
      patronPredictionWinLoss = MoneyAmount.zero.get)
}

private[reports] final case class PredictionMarketReportSummary(
    marketTitle: String,
    categoryLabel: String,
    transfersToPrediction: MoneyAmount,
    transfersFromPrediction: MoneyAmount,
    cancelledPredictionOrders: MoneyAmount,
    predictionWinLoss: MoneyAmount)

private[reports] final case class PredictionResultCategorySummary(
    categoryLabel: String,
    ticketBetSales: MoneyAmount,
    ticketsBetsPaid: MoneyAmount,
    ticketsBetsCancelled: MoneyAmount,
    ticketsBetsVoided: MoneyAmount,
    resettledBetAdjustment: MoneyAmount,
    netPredictionGrossRevenue: MoneyAmount)

private[reports] final case class PredictionResultDetailSummary(
    orderId: String,
    punterId: PunterId,
    categoryLabel: String,
    marketTitle: String,
    outcomeLabel: String,
    transactionTime: OffsetDateTime,
    stakePlacedAmount: MoneyAmount,
    paidAmount: MoneyAmount,
    cancelledAmount: MoneyAmount,
    voidedAmount: MoneyAmount,
    resettledAdjustment: MoneyAmount,
    netPredictionRevenueImpact: MoneyAmount)

private[reports] object PredictionReportingSummaryProvider {

  val noop: PredictionReportingSummaryProvider = new PredictionReportingSummaryProvider {
    override def summarizePunters(reportingPeriod: ReportingPeriod, punterIds: Set[PunterId])(implicit
        ec: ExecutionContext): Future[Map[PunterId, PredictionPunterReportSummary]] =
      Future.successful(punterIds.map(_ -> PredictionPunterReportSummary.empty).toMap)

      override def summarizeMarkets(reportingPeriod: ReportingPeriod)(implicit
          ec: ExecutionContext): Future[Seq[PredictionMarketReportSummary]] =
        Future.successful(Seq.empty)

      override def summarizeResultCategories(reportingPeriod: ReportingPeriod)(implicit
          ec: ExecutionContext): Future[Seq[PredictionResultCategorySummary]] =
        Future.successful(Seq.empty)

      override def summarizeResultDetails(reportingPeriod: ReportingPeriod)(implicit
          ec: ExecutionContext): Future[Seq[PredictionResultDetailSummary]] =
        Future.successful(Seq.empty)
  }

  def fromQueries(predictionReadModels: PredictionQueryService): PredictionReportingSummaryProvider =
    new PredictionReportingSummaryProvider {
      override def summarizePunters(reportingPeriod: ReportingPeriod, punterIds: Set[PunterId])(implicit
          ec: ExecutionContext): Future[Map[PunterId, PredictionPunterReportSummary]] =
        Future
          .traverse(punterIds.toSeq) { punterId =>
            predictionReadModels
              .listOrdersForPunter(punterId.value)
              .map(orders => punterId -> summarizePunterOrders(reportingPeriod, orders))
          }
          .map(_.toMap)

      override def summarizeMarkets(reportingPeriod: ReportingPeriod)(implicit
          ec: ExecutionContext): Future[Seq[PredictionMarketReportSummary]] =
        predictionReadModels
          .listAllOrders()
          .map(orders => PredictionReportingSummaryProvider.summarizeMarkets(reportingPeriod, orders))

      override def summarizeResultCategories(reportingPeriod: ReportingPeriod)(implicit
          ec: ExecutionContext): Future[Seq[PredictionResultCategorySummary]] =
        predictionReadModels
          .listAllOrders()
          .map(orders => PredictionReportingSummaryProvider.summarizeResultCategories(reportingPeriod, orders))

      override def summarizeResultDetails(reportingPeriod: ReportingPeriod)(implicit
          ec: ExecutionContext): Future[Seq[PredictionResultDetailSummary]] =
        predictionReadModels
          .listAllOrders()
          .map(orders => PredictionReportingSummaryProvider.summarizeResultDetails(reportingPeriod, orders))
    }

  private[dge19] def summarizePunterOrders(
      reportingPeriod: ReportingPeriod,
      orders: Seq[PredictionOrderView]): PredictionPunterReportSummary = {
    val normalizedOrders = orders.map(toLifecycleSnapshot)

    normalizedOrders.foldLeft(
      PredictionPunterReportSummary.empty.copy(
        endingPredictionExposure = MoneyAmount(normalizedOrders.filter(isOpenAt(reportingPeriod)).map(_.stakeUsd).sum))) {
      case (acc, order) =>
        acc.copy(
          transfersToPrediction =
            if (createdWithin(reportingPeriod, order)) acc.transfersToPrediction + MoneyAmount(order.stakeUsd)
            else acc.transfersToPrediction,
          cancelledPredictionOrders =
            if (cancelledWithin(reportingPeriod, order)) acc.cancelledPredictionOrders + MoneyAmount(order.stakeUsd)
            else acc.cancelledPredictionOrders,
          transfersFromPrediction =
            if (settledWithin(reportingPeriod, order)) acc.transfersFromPrediction + settlementPayout(order) else acc.transfersFromPrediction,
          patronPredictionWinLoss =
            if (settledWithin(reportingPeriod, order)) acc.patronPredictionWinLoss + settlementWinLoss(order)
            else acc.patronPredictionWinLoss)
    }
  }

  private[dge19] def summarizeMarkets(
      reportingPeriod: ReportingPeriod,
      orders: Seq[PredictionOrderView]): Seq[PredictionMarketReportSummary] =
    orders
      .map(toLifecycleSnapshot)
      .groupBy(_.marketId)
      .toSeq
      .sortBy { case (_, marketOrders) => marketOrders.headOption.map(_.marketTitle).getOrElse("") }
      .map {
        case (_, marketOrders) =>
          PredictionMarketReportSummary(
            marketTitle = marketOrders.headOption.map(_.marketTitle).getOrElse("Unknown Prediction Market"),
            categoryLabel = marketOrders.headOption.map(_.categoryLabel).getOrElse("Prediction"),
            transfersToPrediction = MoneyAmount(marketOrders.filter(createdWithin(reportingPeriod, _)).map(_.stakeUsd).sum),
            transfersFromPrediction = MoneyAmount(marketOrders.filter(settledWithin(reportingPeriod, _)).map(settlementPayout).foldLeft(BigDecimal(0))(_ + _.amount)),
            cancelledPredictionOrders = MoneyAmount(
              marketOrders.filter(cancelledWithin(reportingPeriod, _)).map(_.stakeUsd).sum),
            predictionWinLoss = MoneyAmount(
              marketOrders.filter(settledWithin(reportingPeriod, _)).map(settlementWinLoss).foldLeft(BigDecimal(0))(_ + _.amount)))
      }
      .filterNot(summary =>
        summary.transfersToPrediction == MoneyAmount.zero.get &&
        summary.transfersFromPrediction == MoneyAmount.zero.get &&
        summary.cancelledPredictionOrders == MoneyAmount.zero.get &&
        summary.predictionWinLoss == MoneyAmount.zero.get)

  private[dge19] def summarizeResultCategories(
      reportingPeriod: ReportingPeriod,
      orders: Seq[PredictionOrderView]): Seq[PredictionResultCategorySummary] =
    orders
      .map(toLifecycleSnapshot)
      .groupBy(_.categoryLabel)
      .toSeq
      .sortBy(_._1)
      .map {
        case (categoryLabel, categoryOrders) =>
          val ticketBetSales = MoneyAmount(categoryOrders.filter(createdWithin(reportingPeriod, _)).map(_.stakeUsd).sum)
          val ticketsBetsPaid = MoneyAmount(
            categoryOrders.filter(order => paidWithin(reportingPeriod, order)).map(paidAmount).foldLeft(BigDecimal(0))(_ + _.amount))
          val ticketsBetsCancelled = MoneyAmount(
            categoryOrders.filter(cancelledWithin(reportingPeriod, _)).map(_.stakeUsd).sum)
          val ticketsBetsVoided = MoneyAmount(
            categoryOrders.filter(voidedWithin(reportingPeriod, _)).map(_.stakeUsd).sum)
          val resettledBetAdjustment = MoneyAmount(
            categoryOrders.filter(resettledWithin(reportingPeriod, _)).map(resettledAdjustment).foldLeft(BigDecimal(0))(_ + _.amount))

          PredictionResultCategorySummary(
            categoryLabel = categoryLabel,
            ticketBetSales = ticketBetSales,
            ticketsBetsPaid = ticketsBetsPaid,
            ticketsBetsCancelled = ticketsBetsCancelled,
            ticketsBetsVoided = ticketsBetsVoided,
            resettledBetAdjustment = resettledBetAdjustment,
            netPredictionGrossRevenue =
              ticketBetSales - ticketsBetsPaid - ticketsBetsCancelled - ticketsBetsVoided - resettledBetAdjustment)
      }
      .filterNot(summary =>
        summary.ticketBetSales == MoneyAmount.zero.get &&
        summary.ticketsBetsPaid == MoneyAmount.zero.get &&
        summary.ticketsBetsCancelled == MoneyAmount.zero.get &&
        summary.ticketsBetsVoided == MoneyAmount.zero.get &&
        summary.resettledBetAdjustment == MoneyAmount.zero.get &&
        summary.netPredictionGrossRevenue == MoneyAmount.zero.get)

  private[dge19] def summarizeResultDetails(
      reportingPeriod: ReportingPeriod,
      orders: Seq[PredictionOrderView]): Seq[PredictionResultDetailSummary] =
    orders
      .map(order => order -> toLifecycleSnapshot(order))
      .collect {
        case (order, snapshot) if resultDetailWithin(reportingPeriod, snapshot) =>
          PredictionResultDetailSummary(
            orderId = order.orderId,
            punterId = PunterId(order.punterId),
            categoryLabel = order.categoryLabel,
            marketTitle = order.marketTitle,
            outcomeLabel = order.outcomeLabel,
            transactionTime = snapshot.updatedAt,
            stakePlacedAmount = MoneyAmount(order.stakeUsd),
            paidAmount = paidAmount(snapshot),
            cancelledAmount = if (snapshot.status == "cancelled") MoneyAmount(order.stakeUsd) else MoneyAmount.zero.get,
            voidedAmount = if (snapshot.status == "voided") MoneyAmount(order.stakeUsd) else MoneyAmount.zero.get,
            resettledAdjustment = resettledAdjustment(snapshot),
            netPredictionRevenueImpact =
              MoneyAmount(order.stakeUsd) - paidAmount(snapshot) -
                (if (snapshot.status == "cancelled") MoneyAmount(order.stakeUsd) else MoneyAmount.zero.get) -
                (if (snapshot.status == "voided") MoneyAmount(order.stakeUsd) else MoneyAmount.zero.get) -
                resettledAdjustment(snapshot))
      }
      .sortBy(summary => (summary.transactionTime, summary.orderId))

  private final case class PredictionOrderLifecycleSnapshot(
      marketId: String,
      marketTitle: String,
      categoryLabel: String,
      status: String,
      stakeUsd: BigDecimal,
      maxPayoutUsd: BigDecimal,
      maxProfitUsd: BigDecimal,
      createdAt: OffsetDateTime,
      updatedAt: OffsetDateTime)

  private def toLifecycleSnapshot(order: PredictionOrderView): PredictionOrderLifecycleSnapshot =
    PredictionOrderLifecycleSnapshot(
      marketId = order.marketId,
      marketTitle = order.marketTitle,
      categoryLabel = order.categoryLabel,
      status = order.status.trim.toLowerCase,
      stakeUsd = order.stakeUsd,
      maxPayoutUsd = order.maxPayoutUsd,
      maxProfitUsd = order.maxProfitUsd,
      createdAt = OffsetDateTime.parse(order.createdAt),
      updatedAt = OffsetDateTime.parse(order.updatedAt))

  private def createdWithin(reportingPeriod: ReportingPeriod, order: PredictionOrderLifecycleSnapshot): Boolean =
    within(reportingPeriod, order.createdAt)

  private def cancelledWithin(reportingPeriod: ReportingPeriod, order: PredictionOrderLifecycleSnapshot): Boolean =
    order.status == "cancelled" && within(reportingPeriod, order.updatedAt)

  private def settledWithin(reportingPeriod: ReportingPeriod, order: PredictionOrderLifecycleSnapshot): Boolean =
    order.status match {
      case "won" | "lost" | "voided" | "pushed" | "resettled" => within(reportingPeriod, order.updatedAt)
      case _                                                   => false
    }

  private def paidWithin(reportingPeriod: ReportingPeriod, order: PredictionOrderLifecycleSnapshot): Boolean =
    order.status match {
      case "won" | "pushed" => within(reportingPeriod, order.updatedAt)
      case _                => false
    }

  private def voidedWithin(reportingPeriod: ReportingPeriod, order: PredictionOrderLifecycleSnapshot): Boolean =
    order.status == "voided" && within(reportingPeriod, order.updatedAt)

  private def resettledWithin(reportingPeriod: ReportingPeriod, order: PredictionOrderLifecycleSnapshot): Boolean =
    order.status == "resettled" && within(reportingPeriod, order.updatedAt)

  private def isOpenAt(reportingPeriod: ReportingPeriod)(order: PredictionOrderLifecycleSnapshot): Boolean =
    order.status == "open" && order.createdAt.isBefore(reportingPeriod.periodEnd)

  private def resultDetailWithin(reportingPeriod: ReportingPeriod, order: PredictionOrderLifecycleSnapshot): Boolean =
    order.status match {
      case "won" | "lost" | "cancelled" | "voided" | "pushed" | "resettled" => within(reportingPeriod, order.updatedAt)
      case _                                                                  => false
    }

  private def within(reportingPeriod: ReportingPeriod, timestamp: OffsetDateTime): Boolean =
    !timestamp.isBefore(reportingPeriod.periodStart) && timestamp.isBefore(reportingPeriod.periodEnd)

  private def settlementPayout(order: PredictionOrderLifecycleSnapshot): MoneyAmount =
    order.status match {
      case "won"       => MoneyAmount(order.maxPayoutUsd)
      case "voided"    => MoneyAmount(order.stakeUsd)
      case "pushed"    => MoneyAmount(order.stakeUsd)
      case "resettled" => MoneyAmount(order.maxPayoutUsd)
      case "lost"      => MoneyAmount.zero.get
      case _           => MoneyAmount.zero.get
    }

  private def paidAmount(order: PredictionOrderLifecycleSnapshot): MoneyAmount =
    order.status match {
      case "won"    => MoneyAmount(order.maxPayoutUsd)
      case "pushed" => MoneyAmount(order.stakeUsd)
      case _        => MoneyAmount.zero.get
    }

  private def resettledAdjustment(order: PredictionOrderLifecycleSnapshot): MoneyAmount =
    order.status match {
      case "resettled" => MoneyAmount(order.maxPayoutUsd - order.stakeUsd)
      case _           => MoneyAmount.zero.get
    }

  private def settlementWinLoss(order: PredictionOrderLifecycleSnapshot): MoneyAmount =
    order.status match {
      case "won"       => MoneyAmount(order.maxProfitUsd)
      case "lost"      => MoneyAmount(-order.stakeUsd)
      case "resettled" => MoneyAmount(order.maxPayoutUsd - order.stakeUsd)
      case _           => MoneyAmount.zero.get
    }
}
