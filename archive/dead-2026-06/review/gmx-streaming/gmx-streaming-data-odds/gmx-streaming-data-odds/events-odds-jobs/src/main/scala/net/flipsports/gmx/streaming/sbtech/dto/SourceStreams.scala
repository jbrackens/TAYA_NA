package net.flipsports.gmx.streaming.sbtech.dto

import net.flipsports.gmx.streaming.sbtech.SourceTypes.Streams._

case class SourceStreams(events: OddsStream, markets: OddsStream, selections: OddsStream)