package tech.argyll.gmx.predictorgame.domain.model.team

import tech.argyll.gmx.predictorgame.Tables.EventsRow
import tech.argyll.gmx.predictorgame.domain.model.team.TeamCompetitionSelectionDetails.readString

case class TeamCompetitionEvent(event: EventsRow,
                                homeDetails: TeamCompetitionSelectionDetails,
                                awayDetails: TeamCompetitionSelectionDetails) {
  def homeId: String = {
    event.selectionAId
  }

  def awayId: String = {
    event.selectionBId
  }
}

object TeamCompetitionEvent {
  def apply(event: EventsRow): TeamCompetitionEvent = new TeamCompetitionEvent(event,
    readString(event.selectionADetails.get),
    readString(event.selectionBDetails.get)
  )
}
