package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.Tag

import phoenix.core.persistence.DBUtils
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.infrastructure.ReportingJsonFormats._
import phoenix.reports.infrastructure.SlickBetEventsRepository.BetEventTable

final class SlickBetEventsRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends BetEventsRepository {

  import dbConfig.db

  private val betEvents: TableQuery[BetEventTable] = TableQuery[BetEventTable]

  def upsert(betEvent: BetEvent): Future[Unit] =
    db.run(betEvents.insertOrUpdate(betEvent)).map(_ => ())

  override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] = {
    val query = betEvents.filter(withinReportingPeriod(_, period)).sortBy(_.createdAt)
    DBUtils.streamingSource(db, query.result)
  }

  private def withinReportingPeriod(betEvent: BetEventTable, period: ReportingPeriod): Rep[Boolean] =
    betEvent.createdAt >= period.periodStart && betEvent.createdAt < period.periodEnd
}

object SlickBetEventsRepository {
  private implicit val betEventMapper: BaseColumnType[BetEvent] = jsonTypeMapper

  private final class BetEventTable(tag: Tag) extends Table[BetEvent](tag, "reporting_bet_events") {
    type TableRow = (EventId, BetEvent, OffsetDateTime)

    def eventId = column[EventId]("event_id", O.PrimaryKey)
    def event = column[BetEvent]("event")
    def createdAt = column[OffsetDateTime]("created_at")

    override def * : ProvenShape[BetEvent] =
      (eventId, event, createdAt) <> (fromTableRow, toTableRow)

    private def fromTableRow(row: TableRow): BetEvent =
      row match {
        case (_, event, _) => event
      }

    private def toTableRow(event: BetEvent): Option[TableRow] = {
      Some((event.eventId, event, event.operationTime))
    }
  }
}
