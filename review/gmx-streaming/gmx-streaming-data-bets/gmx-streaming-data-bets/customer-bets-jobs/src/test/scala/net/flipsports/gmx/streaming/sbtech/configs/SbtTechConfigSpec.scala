package net.flipsports.gmx.streaming.sbtech.configs

import net.flipsports.gmx.streaming.tests.StreamingTestBase


class SbtTechConfigSpec extends StreamingTestBase {

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
