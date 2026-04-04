package tech.argyll.gmx.predictorgame.services.prediction

import java.sql.Timestamp
import java.time.{ZoneId, ZonedDateTime}

import javax.inject.{Inject, Singleton}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import play.api.libs.json.{JsNull, JsValue, Json}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ExtensionMethodConversions
import tech.argyll.gmx.predictorgame.Tables.{EventPredictionsRow, EventsRow, UserPredictionsRow}
import tech.argyll.gmx.predictorgame.common.CollectionsOps
import tech.argyll.gmx.predictorgame.domain.model.EventStatus
import tech.argyll.gmx.predictorgame.domain.model.SportType._
import tech.argyll.gmx.predictorgame.domain.repository.PredictionRepository
import tech.argyll.gmx.predictorgame.services.prediction.Evaluation.Evaluation

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class PredictionLoader @Inject()(val dbConfigProvider: DatabaseConfigProvider,
                                 predictionRepo: PredictionRepository)
                                (implicit ec: ExecutionContext)
  extends PredictionValidations
    with CollectionsOps
    with HasDatabaseConfigProvider[JdbcProfile] with ExtensionMethodConversions {

  implicit val dbc: DatabaseConfig[JdbcProfile] = dbConfig


  def loadStoredPredictions(roundLocked: Boolean, prediction: UserPredictionsRow, events: Seq[EventsRow])
                           (implicit sportType: SportType, currentTime: Timestamp): Future[Seq[EventPrediction]] = {
    dbc.db.run(predictionRepo.listEventPredictions(prediction))
      .map(stored => joinStoredPredictionsWithEvents(stored, events))
      .map(_.map {
        case (Some(ep), Some(ev)) => updateEvent(ep, convertEvent(roundLocked, ev))
        case (_, _) => throw new IllegalStateException(s"Selections for user '${prediction.userId}' in round '${prediction.roundId}' " +
          "does not match expected events - should never happen!!")
      })
  }

  def loadFromEvents(roundLocked: Boolean, events: Seq[EventsRow])
                    (implicit sportType: SportType, currentTime: Timestamp): Future[Seq[EventPrediction]] = {
    Future.successful {
      events
        .sortBy(sortEmptyRound)
        .map(e => convertEvent(roundLocked, e))
        .zip(Stream.from(matchPerWeek, -1))
        .map { case (e, i) => e.copy(points = i) }
    }
  }


  private def sortEmptyRound(implicit sportType: SportType, currentTime: Timestamp): EventsRow => (Boolean, Long, String) = {
    sportType match {
      case FOOTBALL => e => (isEventLocked(e, currentTime), e.startTime.getTime, e.selectionAId)
      case HORSE_RACING => e => (false, e.startTime.getTime, e.selectionAId)
    }
  }

  private def convertEvent(roundLocked: Boolean, event: EventsRow)
                          (implicit currentTime: Timestamp) = {
    EventPrediction(event.id, getLocalDateTime(event.startTime),
      Vector(
        EventSelection(0, event.selectionAId, getNullsafeJsValue(event.selectionADetails)),
        EventSelection(1, event.selectionBId, getNullsafeJsValue(event.selectionBDetails))
      ), 0, None, calculateStatus(event, currentTime), roundLocked || isEventLocked(event, currentTime),
      event.winner, None, None, getNullsafeJsValue(event.eventDetails))
  }

  private def getNullsafeJsValue(input: Option[String]): JsValue = {
    input.map(Json.parse).getOrElse(JsNull)
  }

  private def updateEvent(eventPrediction: EventPredictionsRow, event: EventPrediction) = {
    var score: Option[Int] = None
    var evaluation: Option[Evaluation] = None

    if (event.matchStatus.equals(EventStatus.FINISHED.toString)) {
      score = eventPrediction.score
      evaluation = eventPrediction.score.map(s => if (s > 0) {
        Evaluation.WON
      } else {
        Evaluation.LOST
      })
    }

    event.copy(points = eventPrediction.points,
      selection = eventPrediction.selection,
      locked = event.locked || eventPrediction.locked,
      score = score,
      evaluation = evaluation)
  }

  private def getLocalDateTime(time: Timestamp) =
    ZonedDateTime.ofInstant(time.toInstant, ZoneId.of("UTC"))

  private def joinStoredPredictionsWithEvents(stored: Seq[EventPredictionsRow], events: Seq[EventsRow]): List[(Option[EventPredictionsRow], Option[EventsRow])] = {
    val storedKey = (s: EventPredictionsRow) => s.eventId
    val eventKey = (e: EventsRow) => e.id

    val storedSorted = stored.toList.sortBy(storedKey).map(i => (storedKey(i), i))
    val eventsSorted = events.toList.sortBy(eventKey).map(i => (eventKey(i), i))

    outerJoin(storedSorted, eventsSorted)
  }
}
