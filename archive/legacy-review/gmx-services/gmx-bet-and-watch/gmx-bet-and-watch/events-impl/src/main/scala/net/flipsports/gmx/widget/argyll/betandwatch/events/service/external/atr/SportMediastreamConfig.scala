package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr

import com.typesafe.config.Config

case class SportMediastreamConfig(url: String, partnerCode: String, password: String, seed: String)

object SportMediastreamConfig {
  def load(config: Config): SportMediastreamConfig = SportMediastreamConfig(
    config.getString("app.external.atr.sms-api.url"),
    config.getString("app.external.atr.sms-api.partner"),
    config.getString("app.external.atr.sms-api.password"),
    config.getString("app.external.atr.sms-api.seed")
  )
}