package stella.events.utils

import com.typesafe.config.ConfigFactory
import pureconfig.generic.auto._

import stella.common.models.instances._

import stella.events.config.EventIngestorConfig

object EventIngestorTestConfig {
  def loadConfig(): EventIngestorConfig = {
    val config = ConfigFactory.load()
    EventIngestorConfig(config)
  }
}
