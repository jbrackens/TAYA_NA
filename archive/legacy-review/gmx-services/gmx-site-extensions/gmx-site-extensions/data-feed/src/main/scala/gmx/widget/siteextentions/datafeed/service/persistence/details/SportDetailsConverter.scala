package gmx.widget.siteextentions.datafeed.service.persistence.details

import tech.argyll.video.domain.model.EventDetails
import tech.argyll.video.domain.model.EventModel
import tech.argyll.video.domain.model.SelectionDetails
import tech.argyll.video.domain.model.SelectionModel

import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate

trait SportDetailsConverter {

  def provideEventDetails(target: EventModel, source: EventUpdate): EventDetails

  def provideSelectionDetails(target: SelectionModel, source: SelectionUpdate): SelectionDetails

}
