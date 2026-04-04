package net.flipsports.gmx.streaming.data.v1

import net.flipsports.gmx.streaming.sbtech.configs.{SourceBrand, Sources}

object SourcesDataProvider {

  val redZoneSposts = SourceBrand(154, "redZoneSports", "redZoneSports")

  val sportsNations = SourceBrand(155, "sportNations", "sportNations")

  val empty = SourceBrand(-1, "", "")

  val sources = Sources(sportsNations, redZoneSposts, empty)
}
