package net.flipsports.gmx.streaming.idefix.configs

import net.flipsports.gmx.streaming.BaseTestSpec

class EdifixConfigSpec extends BaseTestSpec {

  "EdifixConfig" must {

    "Load form applicationConf" in {

      // given

      // when
      val config = ConfigurationLoader.apply(IdefixConfig.name)

      // then
      val loadedConfig = config.get
      loadedConfig should not be (null)
      loadedConfig.sourceTopics.schemaRegistry should  not be (null)
    }
  }
}
