package tech.argyll.gmx.predictorgame.services.prediction

import java.sql.Timestamp

import javax.inject.{Inject, Singleton}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ExtensionMethodConversions
import tech.argyll.gmx.predictorgame.Tables.{EventPredictionsRow, EventsRow, RoundsRow, UserPredictionsRow, UsersRow}
import tech.argyll.gmx.predictorgame.common.CollectionsOps
import tech.argyll.gmx.predictorgame.common.uuid.UUIDGenerator
import tech.argyll.gmx.predictorgame.domain.model.SportType.SportType
import tech.argyll.gmx.predictorgame.domain.repository.{EventRepository, PredictionRepository, RoundRepository}
import tech.argyll.gmx.predictorgame.engine.BusinessConditions
import tech.argyll.gmx.predictorgame.security.auth.UserDetails
import tech.argyll.gmx.predictorgame.services.user.IUserService

import scala.concurrent.{ExecutionContext, Future}

trait IPredictionService {
  def getPredictions(competition: String, roundNo: Int, userDetails: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[RoundPrediction]

  def storePredictions(competition: String, roundNo: Int, userDetails: UserDetails, selectedPredictions: Seq[SelectedPrediction])(implicit sportType: SportType, currentTime: Timestamp): Future[Any]

  def removePredictions(competition: String, roundNo: Int, userDetails: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[Any]
}


//TODO split this service !!
@Singleton
class PredictionService @Inject()(val dbConfigProvider: DatabaseConfigProvider,
                                  userService: IUserService, roundRepo: RoundRepository, eventRepo: EventRepository,
                                  predictionLoader: PredictionLoader, predictionRepo: PredictionRepository)
                                 (implicit ec: ExecutionContext)
  extends IPredictionService with PredictionValidations with BusinessConditions
    with CollectionsOps
    with HasDatabaseConfigProvider[JdbcProfile] with ExtensionMethodConversions {

  import profile.api._

  implicit val dbc: DatabaseConfig[JdbcProfile] = dbConfig


  override def getPredictions(competition: String, roundNo: Int, userDetails: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[RoundPrediction] = {
    val input = prepareRoundAndUser(competition, roundNo, userDetails)

    input.flatMap { case (r, u) =>
      for {
        events <- dbc.db.run(eventRepo.listEvents(r.id))
        existing <- dbc.db.run(predictionRepo.findUserPredictions(r.id, u.id))
        result <- existing
          .map(up => predictionLoader.loadStoredPredictions(isUserRoundLocked(r, up, currentTime), up, events)
            .map(p => RoundPrediction(computeUserRoundStatus(r, up), computeQualification(r, up), inRightOrder(p))))
          .getOrElse(predictionLoader.loadFromEvents(isRoundLocked(r, currentTime), events)
            .map(p => RoundPrediction(computeRoundStatus(r), None, inRightOrder(p))))
      } yield result
    }
  }

  private def prepareRoundAndUser(competition: String, roundNo: Int, userDetails: UserDetails)
                                 (implicit sportType: SportType, currentTime: Timestamp) = {
    for {
      r <- dbc.db.run(roundRepo.getRound(competition, roundNo))
      u <- userService.storeUser(userDetails)
    } yield (r, u)
  }

  private def computeUserRoundStatus(round: RoundsRow, prediction: UserPredictionsRow)
                           (implicit currentTime: Timestamp) = {
    if (isRoundFinished(round, currentTime)) {
      RoundStatus.FINISHED
    } else if (isUserRoundLocked(round, prediction, currentTime)) {
      RoundStatus.LOCKED
    } else {
      RoundStatus.SAVED
    }
  }

  private def computeRoundStatus(round: RoundsRow)
                                (implicit currentTime: Timestamp) = {
    if (isRoundFinished(round, currentTime)) {
      RoundStatus.FINISHED
    } else if (isRoundLocked(round, currentTime)) {
      RoundStatus.LOCKED
    } else {
      RoundStatus.NEW
    }
  }

  private def computeQualification(round: RoundsRow, prediction: UserPredictionsRow)
                                  (implicit currentTime: Timestamp) = {
    if (isRoundQualificationConfirmed(round, prediction, currentTime)) {
      if (prediction.prizeEligible)
        Some(PrizeQualification.QUALIFIED)
      else
        Some(PrizeQualification.EXCLUDED)
    } else {
      None
    }
  }

  private def inRightOrder(predictions: Seq[EventPrediction]): Seq[EventPrediction] = {
    predictions.sortBy(-_.points)
  }


  override def storePredictions(competition: String, roundNo: Int, userDetails: UserDetails, selectedPredictions: Seq[SelectedPrediction])(implicit sportType: SportType, currentTime: Timestamp): Future[Any] = {
    validateSeq(selectedPredictions)

    val input = prepareRoundAndUser(competition, roundNo, userDetails)

    input.flatMap { case (r, u) =>
      val operation = for {
        existing <- predictionRepo.findUserPredictions(r.id, u.id)
        result <- existing.map(up => mergeWithStoredPredictions(r, up, selectedPredictions))
          .getOrElse(addPredictions(r, u, selectedPredictions))
      } yield result

      dbc.db.run(operation.transactionally)
    }
  }

  private def mergeWithStoredPredictions(round: RoundsRow, up: UserPredictionsRow, selectedPredictions: Seq[SelectedPrediction])
                                        (implicit currentTime: Timestamp): DBIO[Any] = {
    validateRound(round, up, currentTime)
    val result = for {
      events <- eventRepo.listEvents(up.roundId)
      stored <- predictionRepo.listEventPredictions(up)
      result <- predictionRepo.insertOrUpdate(mergeEventPredictions(up, selectedPredictions, events, stored))
    } yield result

    result.transactionally
  }

  private def mergeEventPredictions(prediction: UserPredictionsRow, selectedPredictions: Seq[SelectedPrediction], events: Seq[EventsRow], stored: Seq[EventPredictionsRow])
                                   (implicit currentTime: Timestamp): Seq[EventPredictionsRow] = {
    joinAll(selectedPredictions, events, stored).map {
      case (Some(sp), Some((Some(ev), Some(ep)))) => {
        validateUpdated(sp, ev, ep, currentTime)
        ep.copy(selection = sp.selection, points = sp.points)
      }
      case (_, _) => throw new IllegalArgumentException(s"Event list in round '${prediction.roundId}' " +
        "does not match provided selections - please send all and only events from single round.")
    }
  }

  private def joinAll(selectedPredictions: Seq[SelectedPrediction], events: Seq[EventsRow], stored: Seq[EventPredictionsRow]): List[(Option[SelectedPrediction], Option[(Option[EventsRow], Option[EventPredictionsRow])])] = {
    val storedKey = (s: EventPredictionsRow) => s.eventId
    val eventKey = (e: EventsRow) => e.id

    val storedSorted = stored.toList.sortBy(storedKey).map(i => (storedKey(i), i))
    val eventsSorted = events.toList.sortBy(eventKey).map(i => (eventKey(i), i))

    val compoundKey = (c: (Option[EventsRow], Any)) => c._1.get.id
    val eventsWithStored = outerJoin(eventsSorted, storedSorted).sortBy(compoundKey).map(i => (compoundKey(i), i))

    val selectedKey = (s: SelectedPrediction) => s.id
    val selectedSorted = selectedPredictions.toList.sortBy(selectedKey).map(i => (selectedKey(i), i))

    outerJoin(selectedSorted, eventsWithStored)
  }

  private def addPredictions(round: RoundsRow, user: UsersRow, selectedPredictions: Seq[SelectedPrediction])
                            (implicit currentTime: Timestamp): DBIO[Any] = {
    validateUserRound(round, currentTime)
    val result = for {
      events <- eventRepo.listEvents(round.id)
      up <- predictionRepo.insertOrUpdate(createUserPredictions(round.id, user.id, selectedPredictions))
      result <- predictionRepo.insertOrUpdate(createEventPredictions(up, selectedPredictions, events))
    } yield result

    result.transactionally
  }

  private def createUserPredictions(roundId: String, userId: String, selectedPredictions: Seq[SelectedPrediction]): UserPredictionsRow = {
    val totalSelection = countSelections(selectedPredictions)
    UserPredictionsRow(UUIDGenerator.uuid(), userId, None, false, roundId, false, totalSelection, 0)
  }

  private def countSelections(selectedPredictions: Seq[SelectedPrediction]) = {
    selectedPredictions.count(s => s.selection.nonEmpty)
  }

  private def createEventPredictions(prediction: UserPredictionsRow, selectedPredictions: Seq[SelectedPrediction], events: Seq[EventsRow])
                                    (implicit currentTime: Timestamp): Seq[EventPredictionsRow] = {
    joinSelectedPredictionsWithEvents(selectedPredictions, events).map {
      case (Some(sp), Some(ev)) =>
        validateNew(sp, ev, currentTime)
        EventPredictionsRow(UUIDGenerator.uuid(), prediction.id, ev.id, sp.selection, sp.points, false, None)
      case (_, _) => throw new IllegalArgumentException(s"Event list in round '${prediction.roundId}' " +
        "does not match provided selections - please send all and only events from single round.")
    }
  }

  private def joinSelectedPredictionsWithEvents(selectedPredictions: Seq[SelectedPrediction], events: Seq[EventsRow]): List[(Option[SelectedPrediction], Option[EventsRow])] = {
    val selectedKey = (s: SelectedPrediction) => s.id
    val eventKey = (e: EventsRow) => e.id

    val selectedSorted = selectedPredictions.toList.sortBy(selectedKey).map(i => (selectedKey(i), i))
    val eventsSorted = events.toList.sortBy(eventKey).map(i => (eventKey(i), i))

    outerJoin(selectedSorted, eventsSorted)
  }


  def removePredictions(competition: String, roundNo: Int, userDetails: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[Int] = {
    val input = prepareRoundAndUser(competition, roundNo, userDetails)

    input.flatMap { case (r, u) =>
      dbc.db.run(predictionRepo.deleteUserPredictions(r.id, u.id))
    }
  }
}
