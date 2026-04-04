package gmx.widget.siteextentions.datafeed.service.persistence.details

import tech.argyll.video.core.sbtech.page.URLBuilder
import tech.argyll.video.domain.model._

import gmx.dataapi.internal.siteextensions.event.ParticipantVenueRoleEnum
import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate
import gmx.widget.siteextentions.datafeed.service.ElementsOps._

abstract class MatchDetailsConverter[T <: TeamCompetitionEventDetails](urlBuilder: URLBuilder)
    extends SportDetailsConverter {

  protected def buildNew: T

  override final def provideEventDetails(target: EventModel, source: EventUpdate): EventDetails = {
    val result: T = buildNew

    source.findParticipant(ParticipantVenueRoleEnum.Home).foreach(p => result.setHomeTeam(p.name))

    source.findParticipant(ParticipantVenueRoleEnum.Away).foreach(p => result.setAwayTeam(p.name))

    val current: T = target.getDetails.asInstanceOf[T]
    if (current == null || current.getEventUrl == null) {
      result.setEventUrl(urlBuilder.buildEventURL(target))
    }
    result
  }

  override final def provideSelectionDetails(target: SelectionModel, source: SelectionUpdate): SelectionDetails =
    None.orNull
}
