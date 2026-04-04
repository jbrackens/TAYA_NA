package tech.argyll.gmx.predictorgame.utils.event

import java.time.{LocalDateTime, ZoneId}

import com.typesafe.scalalogging.LazyLogging
import tech.argyll.gmx.predictorgame.domain.DbConfiguration
import tech.argyll.gmx.predictorgame.domain.repository.{EventRepository, RoundRepository}
import tech.argyll.gmx.predictorgame.engine.ScoreCalculator
import tech.argyll.gmx.predictorgame.engine.racing._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

object HorseRacingEventsFeedSimulator extends App with LazyLogging with DbConfiguration with DomainMapper {

  val eventResults: Seq[Any] = Seq(

      // 927082,Lingfield,2020-02-22 14:05:00.000000 - watchable 3 ; hareem-queen 1
      HorseRacingEventUpdate(927082, "MANUAL_FIX", LocalDateTime.now().atZone(ZoneId.systemDefault()), mapEventStatus("WeighedIn")),
      HorseRacingParticipantUpdate(927082, 1997937, mapHorseStatus("Runner"), Some(3)),
      HorseRacingParticipantUpdate(927082, 2447945, mapHorseStatus("Runner"), Some(1)),

      // 925451,Newcastle,2020-02-22 14:45:00.000000 - RACE Abandoned
      HorseRacingEventUpdate(925451, "MANUAL_FIX", LocalDateTime.now().atZone(ZoneId.systemDefault()), mapEventStatus("Abandoned")),

      // 923317,Lingfield,2020-02-22 15:15:00.000000 - bangkok 3 ; dubai-warrior 1
      HorseRacingEventUpdate(923317, "MANUAL_FIX", LocalDateTime.now().atZone(ZoneId.systemDefault()), mapEventStatus("WeighedIn")),
      HorseRacingParticipantUpdate(923317, 2326825, mapHorseStatus("Runner"), Some(3)),
      HorseRacingParticipantUpdate(923317, 2416831, mapHorseStatus("Runner"), Some(1))

  )


  val engine: ProcessorEngine = new ProcessorEngine(
    config,
    new EventUpdater(config, new EventRepository(config)),
    new ScoreCalculator(config),
    new RoundRepository(config)
  )

  Await.result(eventResults
    .foldLeft(Future.successful[Any](()))
    ((future, event) => future.flatMap(_ => event match {
      case eu: HorseRacingEventUpdate => engine.handleEventUpdate(eu)
      case epu: HorseRacingParticipantUpdate => engine.handleEventParticipantUpdate(epu)
    })),
    Duration.Inf)
}
