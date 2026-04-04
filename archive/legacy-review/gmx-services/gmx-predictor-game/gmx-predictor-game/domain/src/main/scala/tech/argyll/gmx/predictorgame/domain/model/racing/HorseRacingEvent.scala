package tech.argyll.gmx.predictorgame.domain.model.racing

import tech.argyll.gmx.predictorgame.Tables.EventsRow
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseRacingSelectionDetails.readString

case class HorseRacingEvent(event: EventsRow,
                            selectionA: HorseRacingSelectionDetails,
                            selectionB: HorseRacingSelectionDetails)

object HorseRacingEvent {
  def apply(event: EventsRow): HorseRacingEvent = new HorseRacingEvent(event,
    readString(event.selectionADetails.get),
    readString(event.selectionBDetails.get))
}