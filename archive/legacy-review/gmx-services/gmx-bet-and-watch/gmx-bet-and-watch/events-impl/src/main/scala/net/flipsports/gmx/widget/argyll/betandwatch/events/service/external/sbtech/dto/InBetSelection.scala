package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto

import java.time.ZonedDateTime


case class InBetSelection(bet: Bet, selection: Selection)(val loadedAt: ZonedDateTime)