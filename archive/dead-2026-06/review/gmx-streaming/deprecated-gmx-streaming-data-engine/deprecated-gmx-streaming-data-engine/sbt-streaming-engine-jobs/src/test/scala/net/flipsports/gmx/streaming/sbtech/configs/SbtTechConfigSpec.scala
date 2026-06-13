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
      sbtechConfig.sources.sportNation.id should be(154)
      sbtechConfig.sources.redZoneSports.id should be(155)
    }
  }
}
