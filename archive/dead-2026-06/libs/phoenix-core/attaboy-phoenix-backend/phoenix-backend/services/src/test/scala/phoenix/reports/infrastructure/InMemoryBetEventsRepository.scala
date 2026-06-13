package phoenix.reports.infrastructure

import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent

final class InMemoryBetEventsRepository(var events: List[BetEvent] = List.empty) extends BetEventsRepository {
  override def upsert(event: BetEvent): Future[Unit] =
    Future.successful(this.events = events :+ event)

  override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] =
    Source(events).filter(event => event.operationTime >= period.periodStart && event.operationTime < period.periodEnd)
}
