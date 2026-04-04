package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto

import java.time.ZonedDateTime

case class Selection(gameId: Long, lineId: Long, typeName: String, eventDate: ZonedDateTime, odds: Long)