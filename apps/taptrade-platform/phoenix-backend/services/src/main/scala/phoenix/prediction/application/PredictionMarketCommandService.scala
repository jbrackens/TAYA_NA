package phoenix.prediction.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.auditlog.domain.AuditLogger
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.http.PredictionMarketDetailResponse

sealed trait PredictionMarketCommand {
  def marketId: String
  def performedBy: String
  def reason: String
}

object PredictionMarketCommand {
  final case class Suspend(marketId: String, performedBy: String, reason: String) extends PredictionMarketCommand
  final case class Reopen(marketId: String, performedBy: String, reason: String) extends PredictionMarketCommand
  final case class Cancel(marketId: String, performedBy: String, reason: String) extends PredictionMarketCommand
  final case class Resolve(marketId: String, outcomeId: String, performedBy: String, reason: String)
      extends PredictionMarketCommand
  final case class Resettle(marketId: String, outcomeId: String, performedBy: String, reason: String)
      extends PredictionMarketCommand
}

trait PredictionMarketCommandService {
  def execute(command: PredictionMarketCommand)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]]
}

final class CoordinatedPredictionMarketCommandService(
    predictionQueries: PredictionQueryService,
    coordinator: PredictionLifecycleCoordinator,
    auditLogger: Option[AuditLogger] = None,
    lifecycleAuditTransactional: Boolean = false)
    extends PredictionMarketCommandService {

  import PredictionMarketCommand._

  override def execute(command: PredictionMarketCommand)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    predictionQueries.marketDetail(command.marketId).flatMap { beforeDetail =>
      perform(command).flatMap {
        case success @ Right(detail) =>
          auditLogger.filter(_ => !lifecycleAuditTransactional) match {
            case Some(logger) =>
              logger
                .recordPredictionMarketLifecycle(
                  action = auditAction(command),
                  actorId = command.performedBy,
                  targetId = detail.market.marketId,
                  details = command.reason,
                  dataBefore = toAuditSnapshot(beforeDetail, None),
                  dataAfter = toAuditSnapshot(Some(detail), selectedOutcomeId(command)))
                .map(_ => success)
            case None => Future.successful(success)
          }
        case failure => Future.successful(failure)
      }
    }

  private def perform(command: PredictionMarketCommand)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    command match {
      case Suspend(marketId, performedBy, reason) =>
        coordinator.suspendMarket(marketId, performedBy, reason)
      case Reopen(marketId, performedBy, reason) =>
        coordinator.reopenMarket(marketId, performedBy, reason)
      case Cancel(marketId, performedBy, reason) =>
        coordinator.cancelMarket(marketId, performedBy, reason)
      case Resolve(marketId, outcomeId, performedBy, reason) =>
        coordinator.resolveMarket(marketId, outcomeId, performedBy, reason)
      case Resettle(marketId, outcomeId, performedBy, reason) =>
        coordinator.resettleMarket(marketId, outcomeId, performedBy, reason)
    }

  private def auditAction(command: PredictionMarketCommand): String =
    command match {
      case _: Suspend  => "prediction.market.suspended"
      case _: Reopen   => "prediction.market.reopened"
      case _: Cancel   => "prediction.market.cancelled"
      case _: Resolve  => "prediction.market.resolved"
      case _: Resettle => "prediction.market.resettled"
    }

  private def selectedOutcomeId(command: PredictionMarketCommand): Option[String] =
    command match {
      case Resolve(_, outcomeId, _, _)  => Some(outcomeId)
      case Resettle(_, outcomeId, _, _) => Some(outcomeId)
      case _                            => None
    }

  private def toAuditSnapshot(
      detail: Option[PredictionMarketDetailResponse],
      selectedOutcomeId: Option[String]): Map[String, String] =
    detail.fold(Map.empty[String, String]) { response =>
      val market = response.market
      val outcomeFields = selectedOutcomeId
        .flatMap(outcomeId =>
          market.outcomes
            .find(_.outcomeId == outcomeId)
            .map(outcome =>
              Map(
                "outcomeId" -> outcome.outcomeId,
                "outcomeLabel" -> outcome.label)))
        .getOrElse(Map.empty)

      Map(
        "marketId" -> market.marketId,
        "marketTitle" -> market.shortTitle,
        "status" -> market.status,
        "live" -> market.live.toString,
        "featured" -> market.featured.toString) ++ outcomeFields
    }
}
