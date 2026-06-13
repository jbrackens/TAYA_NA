package net.flipsports.gmx.streaming.internal.compliance.configs

import net.flipsports.gmx.streaming.tests.StreamingTestBase


class SbtTechConfigSpec extends StreamingTestBase {

  "SbTechConfig" must {

    "Load form applicationConf" in {

      // given

      // when
      val config = ConfigurationLoader.apply(AppConfig.name)

      // then
      val sbtechConfig = config.get
      sbtechConfig should not be (null)
      sbtechConfig.sourceTopics.walletTransactions.format("sportnation") should be("gmx-messaging.sportnation-ds-wallettransactions")
    }
  }
}
