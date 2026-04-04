package gmx.widget.siteextentions.datafeed.service.persistence.details

import tech.argyll.video.core.sbtech.page.URLBuilder
import tech.argyll.video.domain.model.FootballEventDetails

class FootballDetailsConverter(urlBuilder: URLBuilder) extends MatchDetailsConverter[FootballEventDetails](urlBuilder) {
  override protected def buildNew: FootballEventDetails = new FootballEventDetails()
}
