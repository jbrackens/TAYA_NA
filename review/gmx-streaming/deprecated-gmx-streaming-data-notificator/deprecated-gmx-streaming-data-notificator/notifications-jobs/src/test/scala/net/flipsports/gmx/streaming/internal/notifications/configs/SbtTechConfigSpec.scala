package net.flipsports.gmx.streaming.internal.notifications.configs

import net.flipsports.gmx.streaming.BaseTestSpec

class SbtTechConfigSpec extends BaseTestSpec {

  "SbTechConfig" must {

    "Load form applicationConf" in {

      // given

      // when
      val config = ConfigurationLoader.apply(AppConfig.name)

      // then
      val sbtechConfig = config.get
      sbtechConfig should not be (null)
      sbtechConfig.sourceTopics.customerDetails.format(154) should be("ds_customerdetails_154")
    }
  }
}
