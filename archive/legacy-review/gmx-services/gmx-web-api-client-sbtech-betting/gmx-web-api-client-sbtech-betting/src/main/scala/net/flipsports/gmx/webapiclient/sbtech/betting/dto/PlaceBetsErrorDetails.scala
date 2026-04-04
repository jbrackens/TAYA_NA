package net.flipsports.gmx.webapiclient.sbtech.betting.dto

import java.time.ZonedDateTime

case class PlaceBetsErrorDetails(
    id: Option[String],
    creationDate: Option[ZonedDateTime],
    status: Option[String],
    bets: Seq[DeclinedBet])
