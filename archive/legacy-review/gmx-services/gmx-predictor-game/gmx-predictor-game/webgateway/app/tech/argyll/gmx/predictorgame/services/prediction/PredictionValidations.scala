package tech.argyll.gmx.predictorgame.services.prediction

import java.sql.Timestamp

import tech.argyll.gmx.predictorgame.Tables.{EventPredictionsRow, EventsRow, RoundsRow, UserPredictionsRow}
import tech.argyll.gmx.predictorgame.engine.BusinessConditions

trait PredictionValidations extends BusinessConditions {
  // TODO calculate from round
  val matchPerWeek = 16

  def validateRound(round: RoundsRow, up: UserPredictionsRow, currentTime: Timestamp): Unit = {
    if (isUserRoundLocked(round, up, currentTime)) {
      throw new IllegalArgumentException(s"It's not allowed to edit picks for locked round '${round.number}'")
    }
  }

  def validateUserRound(round: RoundsRow, currentTime: Timestamp): Unit = {
    if (isRoundLocked(round, currentTime)) {
      throw new IllegalArgumentException(s"It's not allowed to add picks for locked round '${round.number}'")
    }
  }

  def validateSeq(predictions: Seq[SelectedPrediction]): Unit = {
    predictions.sortBy(_.points)
      .reverse
      .zip(Stream.from(matchPerWeek, -1))
      .foreach(p => if (p._1.points > matchPerWeek) {
        throw new IllegalArgumentException(s"Invalid points assigned for '${p._1.id}' - maximum points value can be '$matchPerWeek'")
      } else if (p._1.points > p._2) {
        throw new IllegalArgumentException(s"Invalid points assigned for '${p._1.id}' - duplicated points '${p._1.points}'")
      } else if (p._1.points < p._2) {
        throw new IllegalArgumentException(s"Invalid points assigned for '${p._1.id}' - gap in points, expecting '${p._2}'")
      })
  }

  def validateUpdated(prediction: SelectedPrediction, event: EventsRow, stored: EventPredictionsRow, currentTime: Timestamp): Unit = {
    checkSelectionIsAvailable(prediction, event, currentTime)
    if (isUserEventLocked(event, stored, currentTime)) {
      if (prediction.points != stored.points) {
        throw new IllegalArgumentException(s"It's not allowed to change points for locked match '${event.id}'")
      }
      if (prediction.selection != stored.selection) {
        throw new IllegalArgumentException(s"It's not allowed to change selection for locked match '${event.id}'")
      }
    } else {
      checkSelectionIsSpecified(prediction, event)
    }
  }

  def validateNew(prediction: SelectedPrediction, event: EventsRow, currentTime: Timestamp): Unit = {
    checkSelectionIsAvailable(prediction, event, currentTime)
    if (isEventLocked(event, currentTime)) {
      if (prediction.selection.isDefined) {
        throw new IllegalArgumentException(s"It's not allowed to add prediction for locked match '${event.id}'")
      }
    } else {
      checkSelectionIsSpecified(prediction, event)
    }
  }

  private def checkSelectionIsAvailable(prediction: SelectedPrediction, event: EventsRow, currentTime: Timestamp): Unit = {
    prediction.selection.foreach(s =>
      if (s != event.selectionAId && s != event.selectionBId) {
        throw new IllegalArgumentException(s"Invalid selection for '${event.id}' - value '${prediction.selection}' is not available for event")
      }
    )
  }

  private def checkSelectionIsSpecified(prediction: SelectedPrediction, event: EventsRow): Unit = {
    if (prediction.selection.isEmpty) {
      throw new IllegalArgumentException(s"Invalid selection for '${event.id}' - value cannot be empty")
    }
  }
}
