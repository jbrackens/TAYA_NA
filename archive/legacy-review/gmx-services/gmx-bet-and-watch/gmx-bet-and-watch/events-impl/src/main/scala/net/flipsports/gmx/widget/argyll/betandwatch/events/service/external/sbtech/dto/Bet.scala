package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto

import java.time.ZonedDateTime


case class Bet(purchaseID: String, stake: Double, customerId: Long, creationDate: ZonedDateTime)