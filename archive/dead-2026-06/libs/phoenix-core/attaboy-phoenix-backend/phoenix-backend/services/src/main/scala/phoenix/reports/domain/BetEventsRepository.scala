package phoenix.reports.domain

import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent

private[reports] trait BetEventsRepository {
  def upsert(event: BetEvent): Future[Unit]
  def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed]
}
