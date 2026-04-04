package tech.argyll.video.datafeed;

import static tech.argyll.video.domain.test.shared.DomainObjectDbUtils.purgeDb;

import org.testng.annotations.BeforeMethod;
import tech.argyll.video.common.test.shared.AbstractGuiceTest;

public abstract class AbstractDataFeedDBTest extends AbstractGuiceTest {

  @BeforeMethod
  public void setupTest() {
    purgeDb();
  }
}
