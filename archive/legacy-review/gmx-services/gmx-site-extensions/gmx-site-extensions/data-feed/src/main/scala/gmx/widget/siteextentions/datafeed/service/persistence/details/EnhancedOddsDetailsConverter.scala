package gmx.widget.siteextentions.datafeed.service.persistence.details

import tech.argyll.video.domain.model.EventDetails
import tech.argyll.video.domain.model.EventModel
import tech.argyll.video.domain.model.SelectionDetails
import tech.argyll.video.domain.model.SelectionModel

import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate

/**
 * EnhancedOdds / Specials does not support any details on each level (thus empty results)
 */
class EnhancedOddsDetailsConverter extends SportDetailsConverter {
  override def provideEventDetails(target: EventModel, source: EventUpdate): EventDetails =
    None.orNull

  override def provideSelectionDetails(target: SelectionModel, source: SelectionUpdate): SelectionDetails =
    None.orNull
}
