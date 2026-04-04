package net.flipsports.gmx.webapiclient.sbtech.betting.dto

case class Bet(
    trueOdds: Double,
    displayOdds: String,
    selectionsMapped: Seq[SelectionMapped],
    stake: Double,
    potentialReturns: Double,
    `type`: String = "Single",
    numberOfBets: Int = 1)
