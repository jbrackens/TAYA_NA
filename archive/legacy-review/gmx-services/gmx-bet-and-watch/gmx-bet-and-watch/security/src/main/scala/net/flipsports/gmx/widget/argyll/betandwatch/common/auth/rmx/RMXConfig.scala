package net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx

import com.typesafe.config.Config

class RMXConfig(config: Config) {

  val rmxUrl = config.getString("app.auth.rmx.url")
  val rmxClient = config.getString("app.auth.rmx.client_id")
  val rmxClientPass = config.getString("app.auth.rmx.client_password")
  val rmxUser = config.getString("app.auth.rmx.username")
  val rmxUserPass = config.getString("app.auth.rmx.password")

  val company = new Company

  class Company {
    val sportNation = config.getString("app.auth.rmx.dict.company.sport-nation")
    val redZone = config.getString("app.auth.rmx.dict.company.red-zone")
    val giveMeBet = config.getString("app.auth.rmx.dict.company.give-me-bet")
  }
}
