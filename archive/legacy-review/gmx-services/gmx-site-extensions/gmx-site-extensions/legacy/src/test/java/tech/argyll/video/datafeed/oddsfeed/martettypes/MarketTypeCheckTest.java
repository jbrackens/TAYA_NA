package tech.argyll.video.datafeed.oddsfeed.martettypes;

import java.util.Collections;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;
import tech.argyll.video.datafeed.oddsfeed.markettypes.MarketTypeCheck;
import tech.argyll.video.datafeed.oddsfeed.markettypes.model.MarketTypeDict;

public class MarketTypeCheckTest {

  private MarketTypeCheck objectUnderTest;

  @DataProvider
  public static Object[][] invalidMapping() {
    return new Object[][] {
      {prepareSampleType().withEventTypeID(8L)},
      {prepareSampleType().withLineTypeID(10L)},
      {prepareSampleType().withIsQA((byte) 1)}
    };
  }

  @BeforeClass
  public void setupClass() {
    objectUnderTest = new MarketTypeCheck();
  }

  @Test
  public void shouldSucceedForValidMapping() {
    // given

    // when
    objectUnderTest.execute(Collections.singletonList(prepareSampleType()));
    // then

  }

  @Test(dataProvider = "invalidMapping", expectedExceptions = IllegalStateException.class)
  public void shouldFailForInvalidMapping(MarketTypeDict givenDict) {
    // given

    // when
    objectUnderTest.execute(Collections.singletonList(givenDict));
    // then

  }

  private static MarketTypeDict prepareSampleType() {
    return new MarketTypeDict(3L, "someMarket", "someEvent", "someLine", 0L, 3L, (byte) 0);
  }
}
