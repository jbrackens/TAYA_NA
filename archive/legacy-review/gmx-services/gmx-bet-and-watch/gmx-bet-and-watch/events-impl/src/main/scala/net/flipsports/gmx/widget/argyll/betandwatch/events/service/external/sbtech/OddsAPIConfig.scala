package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import com.typesafe.config.Config

case class OddsAPIConfig(url: String)

object OddsAPIConfig {
  def load(config: Config): OddsAPIConfig = OddsAPIConfig(
    config.getString("app.external.sbtech.odds-api.url")
  )
}