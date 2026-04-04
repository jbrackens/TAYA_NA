package tech.argyll.gmx.predictorgame.engine

import java.sql.Timestamp

import tech.argyll.gmx.predictorgame.Tables.{EventPredictionsRow, EventsRow, RoundsRow, UserPredictionsRow}
import tech.argyll.gmx.predictorgame.domain.model.EventStatus

trait BusinessConditions {

  private def isEventStarted(event: EventsRow, currentTime: Timestamp) = {
    !event.startTime.after(currentTime)
  }

  def calculateStatus(event: EventsRow, currentTime: Timestamp): String = {
    // TODO temporally until we have live updates with ONGOING status
    if ((EventStatus.NEW.toString == event.status) && isEventLocked(event, currentTime)) {
      EventStatus.ONGOING.toString
    } else {
      event.status.toString
    }
  }

  def isEventLocked(event: EventsRow, currentTime: Timestamp): Boolean = {
    // TODO temporally until we have live updates with ONGOING status
    (EventStatus.NEW.toString != event.status) || isEventStarted(event, currentTime)
  }

  def isUserEventLocked(event: EventsRow, prediction: EventPredictionsRow, currentTime: Timestamp): Boolean = {
    isEventLocked(event, currentTime) || prediction.locked
  }

  def isRoundFinished(round: RoundsRow, currentTime: Timestamp) = {
    !round.endTime.after(currentTime)
  }

  def isRoundQualificationConfirmed(round: RoundsRow, prediction: UserPredictionsRow, currentTime: Timestamp): Boolean = {
    // TODO temporally until we get live updated
    isRoundFinished(round, currentTime)
  }

  def isRoundLocked(round: RoundsRow, currentTime: Timestamp): Boolean = {
    round.pickDeadline.map(!_.after(currentTime)).getOrElse(isRoundFinished(round, currentTime))
  }

  def isUserRoundLocked(round: RoundsRow, prediction: UserPredictionsRow, currentTime: Timestamp): Boolean = {
    isRoundLocked(round, currentTime) || prediction.locked
  }

}
