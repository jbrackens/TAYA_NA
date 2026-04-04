package eeg.waysun.events.achievements.configs

import eeg.waysun.events.achievements.configs.AppConfigDef.ConfigurationLoader
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class ConfigSpec extends StreamingTestBase {

  "Configuration" must {

    "Load form applicationConf" in {

      // given

      // when
      val config = ConfigurationLoader.apply(AppConfigDef.name)

      // then
      val loadedConfig = config.get
      loadedConfig should not be null
      loadedConfig.sourceTopics.definition.format("any") should be("stella-messaging.default-achievement-definition")
    }
  }
}
