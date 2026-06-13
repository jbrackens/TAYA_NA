package phoenix.punters.exclusion.support

import scala.concurrent.Future

import phoenix.punters.exclusion.domain.SelfExcludedPuntersReport
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReportPublisher

final class MemorizingSelfExcludedPunterReportPublisher(var reports: List[SelfExcludedPuntersReport] = List.empty)
    extends SelfExcludedPuntersReportPublisher {
  override def publish(report: SelfExcludedPuntersReport): Future[Unit] =
    Future.successful {
      reports = reports :+ report
    }
}
