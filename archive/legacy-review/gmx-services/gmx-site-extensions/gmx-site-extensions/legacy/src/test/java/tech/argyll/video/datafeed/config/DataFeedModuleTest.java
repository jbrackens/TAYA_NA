package tech.argyll.video.datafeed.config;

import org.testng.annotations.Test;
import tech.argyll.video.common.test.shared.AppTestConfig;
import tech.argyll.video.core.sbtech.SBTechOperatorType;

public class DataFeedModuleTest {
  @Test
  public void shouldInitializeInjector() {
    // given

    // when
    new AppTestConfig(new DataFeedModule(SBTechOperatorType.SPORT_NATION));

    // then

  }
}
