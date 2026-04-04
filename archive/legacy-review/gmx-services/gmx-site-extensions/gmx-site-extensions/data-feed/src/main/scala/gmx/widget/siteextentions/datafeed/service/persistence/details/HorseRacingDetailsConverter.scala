package gmx.widget.siteextentions.datafeed.service.persistence.details

import tech.argyll.video.core.sbtech.page.URLBuilder
import tech.argyll.video.domain.model.EventDetails
import tech.argyll.video.domain.model.EventModel
import tech.argyll.video.domain.model.SelectionDetails
import tech.argyll.video.domain.model.SelectionModel
import tech.argyll.video.domain.model._

import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate

class HorseRacingDetailsConverter(urlBuilder: URLBuilder) extends SportDetailsConverter {

  override def provideEventDetails(target: EventModel, source: EventUpdate): EventDetails = {
    val result: HorseRacingEventDetails = new HorseRacingEventDetails()

//    result.setEwTerms(...) // TODO (GM-1747): is ewTerms needed anymore?

    val current: HorseRacingEventDetails = target.getDetails.asInstanceOf[HorseRacingEventDetails]
    if (current == null || current.getEventUrl == null) {
      result.setEventUrl(urlBuilder.buildEventURL(target))
    }

    result
  }

  override def provideSelectionDetails(target: SelectionModel, source: SelectionUpdate): SelectionDetails =
    new HorseRacingSelectionDetails()
}
