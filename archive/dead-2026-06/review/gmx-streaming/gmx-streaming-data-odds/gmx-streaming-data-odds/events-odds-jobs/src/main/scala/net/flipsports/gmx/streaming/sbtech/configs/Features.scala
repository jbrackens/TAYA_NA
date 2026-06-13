package net.flipsports.gmx.streaming.sbtech.configs

case class Features(events: Boolean = false,
                    markets: Boolean = false,
                    selections: Boolean = false,
                    dummy: Boolean = false,
                    nulls: Boolean = true,
                    filters: Seq[Filters] = Seq(),
                    subsetName: String = ""
                   )


object Features {

  def allIn(): Features = new Features(
    events = true,
    markets = true,
    selections = true,
    nulls = true
  )
}