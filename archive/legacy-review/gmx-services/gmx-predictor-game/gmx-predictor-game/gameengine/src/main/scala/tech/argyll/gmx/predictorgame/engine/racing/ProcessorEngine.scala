package tech.argyll.gmx.predictorgame.engine.racing

import com.typesafe.scalalogging.LazyLogging
import javax.inject.{Inject, Singleton}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.EventsRow
import tech.argyll.gmx.predictorgame.domain.repository.RoundRepository
import tech.argyll.gmx.predictorgame.engine.ScoreCalculator

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class ProcessorEngine @Inject()(val config: DatabaseConfig[JdbcProfile],
                                eventUpdater: EventUpdater,
                                scoreCalculator: ScoreCalculator,
                                roundRepository: RoundRepository)
                               (implicit ec: ExecutionContext)
  extends LazyLogging {

  import config.profile.api._

  def handleEventUpdate(eventUpdate: HorseRacingEventUpdate): Future[Any] = {
    for {
      event <- eventUpdater.findDbEntry(eventUpdate)
        .map(eventUpdater.shouldUpdate(_, eventUpdate))
      result <- event.map(processChange(_, eventUpdate))
        .getOrElse(Future.successful(Unit))
    } yield result
  }

  def handleEventParticipantUpdate(eventUpdate: HorseRacingParticipantUpdate): Future[Any] = {
    for {
      event <- eventUpdater.findDbEntry(eventUpdate)
        .map(eventUpdater.shouldUpdate(_, eventUpdate))
      result <- event.map(processChange(_, eventUpdate))
        .getOrElse(Future.successful(Unit))
    } yield result
  }

  private def processChange(event: EventsRow, eventUpdate: HorseRacingEventUpdate) = {
    logger.info(s"Processing: $eventUpdate")
    val batch = for {
      updatedEvent <- eventUpdater.applyChanges(event, eventUpdate)
      _ <- eventUpdater.store(updatedEvent)
    } yield ()

    config.db.run(batch.transactionally)
  }

  private def processChange(event: EventsRow, eventUpdate: HorseRacingParticipantUpdate) = {
    logger.info(s"Processing: $eventUpdate")
    val batch = for {
      updatedEvent <- eventUpdater.applyChanges(event, eventUpdate)
      _ <- eventUpdater.store(updatedEvent)
      _ <- scoreCalculator.recalculateScores(updatedEvent)
    } yield ()

    config.db.run(batch.transactionally)
  }

}