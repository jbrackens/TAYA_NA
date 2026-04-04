package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt

import com.typesafe.config.Config

case class EncryptionConfig(userSeed: String)

object EncryptionConfig {
  def load(config: Config): EncryptionConfig = EncryptionConfig(
    config.getString("app.encrypt.user.seed")
  )
}

