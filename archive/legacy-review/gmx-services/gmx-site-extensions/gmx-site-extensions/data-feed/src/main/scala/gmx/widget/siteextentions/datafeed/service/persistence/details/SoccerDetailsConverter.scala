package gmx.widget.siteextentions.datafeed.service.persistence.details

import tech.argyll.video.core.sbtech.page.URLBuilder
import tech.argyll.video.domain.model.SoccerEventDetails

class SoccerDetailsConverter(urlBuilder: URLBuilder) extends MatchDetailsConverter[SoccerEventDetails](urlBuilder) {
  override protected def buildNew: SoccerEventDetails = new SoccerEventDetails()
}
