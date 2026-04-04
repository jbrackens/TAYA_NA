package net.flipsports.gmx.game.argyll.racingroulette.webgateway

import com.softwaremill.macwire.wire
import com.typesafe.config.Config
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.ChangeWatcher
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.{FakeEventSource, KafkaEventSource}

trait DataModule extends EventModule with BaseModule {

  lazy val mockSourceConfig: Config = config.getConfig("app.event-updates.mock-source")
  lazy val mockSourceEnabled: Boolean = mockSourceConfig.getBoolean("enabled")

  lazy val kafkaEventSource: KafkaEventSource = wire[KafkaEventSource]
  lazy val kafkaChangeWatcher: ChangeWatcher = wire[ChangeWatcher]
  kafkaChangeWatcher.buildFromSource(kafkaEventSource)

  if (mockSourceEnabled) {
    val mockEventSource = wire[FakeEventSource]
    val mockChangeWatcher: ChangeWatcher = wire[ChangeWatcher]
    mockChangeWatcher.buildFromSource(mockEventSource)
  }
}
