package net.flipsports.gmx.webapiclient.sbtech.betting.dto

case class PlaceBetsRequest(
    selections: Seq[Selection],
    bets: Seq[Bet],
    oddsStyle: String = "fractional",
    locale: String = "en_GB")
