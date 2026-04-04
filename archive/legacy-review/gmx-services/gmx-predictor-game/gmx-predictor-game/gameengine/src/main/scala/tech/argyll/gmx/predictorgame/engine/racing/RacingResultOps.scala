package tech.argyll.gmx.predictorgame.engine.racing

import tech.argyll.gmx.predictorgame.Tables.EventsRow
import tech.argyll.gmx.predictorgame.domain.model.EventStatus
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseRacingSelectionDetails.writeString
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseStatus.{CASUALTY, NON_RUNNER}
import tech.argyll.gmx.predictorgame.domain.model.racing.{HorseRacingEvent, HorseRacingSelectionDetails}
import tech.argyll.gmx.predictorgame.engine.ScoreCalculator

trait RacingResultOps {

  private val NO_POSITION = Integer.MAX_VALUE

  def recalculateEvent(event: EventsRow, eventUpdate: HorseRacingEventUpdate): EventsRow = {
    event.copy(status = eventUpdate.status.toString)
  }

  def recalculateEvent(event: EventsRow,
                       participantUpdate: HorseRacingParticipantUpdate): EventsRow = {
    val racing = HorseRacingEvent(event)
    var selectionA = racing.selectionA
    var selectionB = racing.selectionB
    var status = event.status
    var winner: Option[String] = None

    if (selectionA.horseId == participantUpdate.horseId) {
      selectionA = updateSelection(participantUpdate, selectionA)
    } else if (selectionB.horseId == participantUpdate.horseId) {
      selectionB = updateSelection(participantUpdate, selectionB)
    }

    if (selectionA.status.contains(NON_RUNNER.toString)
      || selectionB.status.contains(NON_RUNNER.toString)) {
      status = EventStatus.VOID.toString
    }

    if (selectionA.status.contains(CASUALTY.toString)
      && selectionB.status.contains(CASUALTY.toString)) {
      status = EventStatus.VOID.toString
    }

    if (status == EventStatus.FINISHED.toString) {
      val posA = selectionA.finishPosition.getOrElse(NO_POSITION)
      val posB = selectionB.finishPosition.getOrElse(NO_POSITION)

      if (posA < posB) {
        winner = Some(event.selectionAId)
      } else if (posA > posB) {
        winner = Some(event.selectionBId)
      } else { //both equal
        if (posA != NO_POSITION) {
          winner = Some(ScoreCalculator.noWinnerDeadHeat)
        }
      }
    }

    event.copy(status = status,
      selectionADetails = Some(writeString(selectionA)),
      selectionBDetails = Some(writeString(selectionB)),
      winner = winner)
  }

  private def updateSelection(source: HorseRacingParticipantUpdate, target: HorseRacingSelectionDetails) = {
    target.copy(status = Some(source.status.toString),
      finishPosition = source.finishPosition)
  }

}
