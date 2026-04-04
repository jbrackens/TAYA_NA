package gmx.widget.siteextentions.datafeed.service.persistence.details

import tech.argyll.video.domain.model._

import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate

class DetailsConverter(
    enhancedOddsDetailsConverter: EnhancedOddsDetailsConverter,
    footballDetailsConverter: FootballDetailsConverter,
    horseRacingDetailsConverter: HorseRacingDetailsConverter,
    soccerDetailsConverter: SoccerDetailsConverter)
    extends SportDetailsConverter {

  private def selectSportConverter(sport: SportType): SportDetailsConverter =
    sport match {
      case SportType.ENHANCED_ODDS  => enhancedOddsDetailsConverter
      case SportType.FOOTBALL       => footballDetailsConverter
      case SportType.SOCCER         => soccerDetailsConverter
      case SportType.HORSE_RACING   => horseRacingDetailsConverter
      case SportType.VIRTUAL_SPORTS => ??? // TODO should never happen but need to check
    }

  override def provideEventDetails(target: EventModel, source: EventUpdate): EventDetails = {
    selectSportConverter(target.getSport).provideEventDetails(target, source)
  }

  override def provideSelectionDetails(target: SelectionModel, source: SelectionUpdate): SelectionDetails = {
    selectSportConverter(target.getMarket.getEvent.getSport).provideSelectionDetails(target, source)
  }
}
