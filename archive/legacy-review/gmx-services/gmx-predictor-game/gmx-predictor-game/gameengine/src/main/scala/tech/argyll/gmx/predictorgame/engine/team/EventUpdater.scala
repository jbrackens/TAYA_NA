package tech.argyll.gmx.predictorgame.engine.team

import com.typesafe.scalalogging.LazyLogging
import javax.inject.Singleton
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.EventsRow
import tech.argyll.gmx.predictorgame.domain.model.EventStatus
import tech.argyll.gmx.predictorgame.domain.model.team.TeamCompetitionEvent
import tech.argyll.gmx.predictorgame.domain.model.team.TeamCompetitionSelectionDetails.writeString
import tech.argyll.gmx.predictorgame.domain.repository.EventRepository
import tech.argyll.gmx.predictorgame.engine.ScoreCalculator

import scala.concurrent.ExecutionContext

@Singleton
class EventUpdater(val config: DatabaseConfig[JdbcProfile],
                   eventRepo: EventRepository)(implicit ec: ExecutionContext)
  extends LazyLogging {

  import config.profile.api._

  def findDbEntry(eventUpdate: EventUpdate) = {
    config.db.run(eventRepo.getEvent(eventUpdate.id))
  }

  def shouldUpdate(event: EventsRow, eventUpdate: EventUpdate) = {
    Option(event) // separated from above to fail on missing event
      .filter(e => isChanged(e, eventUpdate))
      .filter(_ => isResolved(eventUpdate))
  }

  private def isChanged(event: EventsRow, eventUpdate: EventUpdate): Boolean = {
    val teamEvent = TeamCompetitionEvent(event)

    val changed = (isChanged(teamEvent.homeDetails.score, eventUpdate.homeTeamScore)
      || isChanged(teamEvent.awayDetails.score, eventUpdate.awayTeamScore)
      || isChanged(teamEvent.event.winner, eventUpdate.winner))

    if (!changed)
      logger.info(s"Event data does not change: $eventUpdate")

    changed
  }

  private def isChanged[T](old: Option[T], updated: Option[T]): Boolean = {
    old != updated
  }

  private def isResolved(eventUpdate: EventUpdate): Boolean = {
    val resolved = EventStatus.FINISHED == eventUpdate.status

    if (!resolved)
      logger.info(s"Event is not finished: $eventUpdate")

    resolved
  }

  def applyChanges(event: EventsRow, eventUpdate: EventUpdate):DBIO[EventsRow] = {
    val teamEvent = TeamCompetitionEvent(event)
    val updatedEvent = event.copy(status = eventUpdate.status.toString,
      selectionADetails = Some(writeString(teamEvent.homeDetails.copy(score = eventUpdate.homeTeamScore))),
      selectionBDetails = Some(writeString(teamEvent.awayDetails.copy(score = eventUpdate.awayTeamScore))),
      winner = eventUpdate.winner.orElse(Some(ScoreCalculator.noWinnerDraw)))
    DBIO.successful(updatedEvent)
  }

  def store(updatedEvent: EventsRow): DBIO[Int]  = {
    eventRepo.updateEvent(updatedEvent)
  }
}
