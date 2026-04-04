package net.flipsports.gmx.webapiclient.sbtech.betting.dto

case class PlaceBetsError(statusCode: String, statusDescription: String, response: Option[PlaceBetsErrorDetails])
