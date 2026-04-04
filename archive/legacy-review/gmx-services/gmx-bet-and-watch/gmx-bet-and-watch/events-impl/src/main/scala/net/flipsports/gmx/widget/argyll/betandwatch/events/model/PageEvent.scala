package net.flipsports.gmx.widget.argyll.betandwatch.events.model

import java.time.ZonedDateTime

import net.flipsports.gmx.common.internal.partner.commons.cons.SportType

case class PageEvent(id: Long, sportType: SportType, league: String, startTime: ZonedDateTime, title: String, countryCode: String)