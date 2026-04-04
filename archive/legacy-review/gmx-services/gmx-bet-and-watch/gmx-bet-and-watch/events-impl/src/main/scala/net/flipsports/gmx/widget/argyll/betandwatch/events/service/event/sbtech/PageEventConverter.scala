package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sbtech

import net.flipsports.gmx.common.internal.partner.sbtech.dict.CountryDict
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{NOT_AVAILABLE, PageEvent}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.InLeagueGame

trait PageEventConverter {

  def toPageEvent(game: InLeagueGame)(implicit countryDict: CountryDict): PageEvent = {
    PageEvent(game.game.id, game.sportType.getSportType, game.league.name, game.game.startTime, game.game.title,
      countryDict.getCode(game.league.countryId).orElse(NOT_AVAILABLE))
  }
}
