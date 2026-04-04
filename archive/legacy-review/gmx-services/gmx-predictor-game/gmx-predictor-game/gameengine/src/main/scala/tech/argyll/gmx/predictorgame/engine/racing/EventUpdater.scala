package tech.argyll.gmx.predictorgame.engine.racing

import com.typesafe.scalalogging.LazyLogging
import javax.inject.Singleton
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.EventsRow
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseRacingEvent
import tech.argyll.gmx.predictorgame.domain.repository.EventRepository

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class EventUpdater(val config: DatabaseConfig[JdbcProfile],
                   eventRepo: EventRepository)(implicit ec: ExecutionContext)
  extends LazyLogging
    with RacingResultOps {

  import config.profile.api._

  def findDbEntry(eventUpdate: HorseRacingEventUpdate): Future[Option[EventsRow]] = {
    config.db.run(eventRepo.findEvent(eventUpdate.raceId))
      .map(_.orElse(notFound(eventUpdate)))
  }

  def findDbEntry(participantUpdate: HorseRacingParticipantUpdate): Future[Option[EventsRow]] = {
    config.db.run(eventRepo.findEvent(participantUpdate.raceId))
      .map(_.orElse(notFound(participantUpdate)))
  }

  private def notFound(eventUpdate: HorseRacingUpdate) = {
    logger.info(s"Skipping update, event not in DB - $eventUpdate")
    None
  }

  def shouldUpdate(event: Option[EventsRow], eventUpdate: HorseRacingEventUpdate): Option[EventsRow] = {
    event
  }

  def shouldUpdate(event: Option[EventsRow],
                   participantUpdate: HorseRacingParticipantUpdate): Option[EventsRow] = {
    event
      .filter(e => isAvailableInSelection(e, participantUpdate))
  }

  private def isAvailableInSelection(event: EventsRow,
                                     participantUpdate: HorseRacingParticipantUpdate): Boolean = {
    val racing = HorseRacingEvent(event)

    (racing.selectionA.horseId == participantUpdate.horseId
      || racing.selectionB.horseId == participantUpdate.horseId)
  }

  def applyChanges(event: EventsRow, eventUpdate: HorseRacingEventUpdate): DBIO[EventsRow] = {
    val updatedEvent = recalculateEvent(event, eventUpdate)
    DBIO.successful(updatedEvent)
  }

  def store(updatedEvent: EventsRow): DBIO[Int] = {
    eventRepo.updateEvent(updatedEvent)
  }

  def applyChanges(event: EventsRow, participantUpdate: HorseRacingParticipantUpdate): DBIO[EventsRow] = {
    val updatedEvent: EventsRow = recalculateEvent(event, participantUpdate)
    DBIO.successful(updatedEvent)
  }
}
