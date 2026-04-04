package eeg.waysun.events.validators.configs

import eeg.waysun.events.validators.configs.AppConfigDef.ConfigurationLoader
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class ConfigSpec extends StreamingTestBase {

  "Configuration" should {

    "Load form applicationConf" in {

      // given

      // when
      val config = ConfigurationLoader.apply(AppConfigDef.name)

      // then
      val loadedConfig = config.get
      loadedConfig should not be null
      loadedConfig.sourceTopics.definition.format("any") shouldBe "eeg-messaging.any-event-definition"
    }
  }
}
