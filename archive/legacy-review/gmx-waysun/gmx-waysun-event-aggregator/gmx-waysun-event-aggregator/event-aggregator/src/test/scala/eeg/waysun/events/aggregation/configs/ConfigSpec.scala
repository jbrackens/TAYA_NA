package eeg.waysun.events.aggregation.configs

import eeg.waysun.events.aggregation.configs.AppConfigDef.ConfigurationLoader
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
    }
  }
}
