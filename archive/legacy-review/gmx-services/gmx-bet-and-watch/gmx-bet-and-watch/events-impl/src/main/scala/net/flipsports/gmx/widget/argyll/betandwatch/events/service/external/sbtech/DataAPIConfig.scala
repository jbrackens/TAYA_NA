package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import com.typesafe.config.Config

case class DataAPIConfig(url: String, agent: String, password: String)

object DataAPIConfig {
  def load(config: Config): DataAPIConfig = DataAPIConfig(
    config.getString("app.external.sbtech.data-api.url"),
    config.getString("app.external.sbtech.data-api.agent"),
    config.getString("app.external.sbtech.data-api.password")
  )
}