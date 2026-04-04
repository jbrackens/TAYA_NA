package net.flipsports.gmx.streaming.sbtech.configs

import net.flipsports.gmx.streaming.BaseTestSpec

class SbtTechConfigSpec extends BaseTestSpec {

  "SbTechConfig" must {

    "Load form applicationConf" in {

      // given

      // when
      val config = ConfigurationLoader.apply(SbTechConfig.name)

      // then
      val sbtechConfig = config.get
      sbtechConfig should not be (null)
      sbtechConfig.sourceTopics.schemaRegistry should  not be (null)
    }
  }
}
