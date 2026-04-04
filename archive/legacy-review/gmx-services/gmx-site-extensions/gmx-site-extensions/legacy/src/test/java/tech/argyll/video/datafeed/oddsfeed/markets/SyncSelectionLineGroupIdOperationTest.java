package tech.argyll.video.datafeed.oddsfeed.markets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.times;
import static tech.argyll.video.core.sbtech.SBTechOperatorType.RED_ZONE_SPORTS;
import static tech.argyll.video.core.sbtech.SBTechOperatorType.SPORT_NATION;
import static tech.argyll.video.datafeed.test.shared.HttpCallTestHelper.constructSuccess;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.http.HttpEntity;
import org.apache.http.entity.StringEntity;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;
import tech.argyll.video.common.http.HttpCallResponseHandler;
import tech.argyll.video.common.http.PostMethodCall;
import tech.argyll.video.core.sbtech.SBTechBranchType;
import tech.argyll.video.core.sbtech.SBTechMarketType;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.oddsfeed.LiveOption;
import tech.argyll.video.datafeed.oddsfeed.MainOption;
import tech.argyll.video.datafeed.oddsfeed.MarketTypeRef;
import tech.argyll.video.datafeed.oddsfeed.OddsFeedParser;
import tech.argyll.video.datafeed.oddsfeed.SportRef;

public class SyncSelectionLineGroupIdOperationTest {
  private SyncSelectionLineGroupIdOperation objectUnderTest;

  @Mock private PostMethodCall postMethodCallMock;
  @Mock private OddsFeedParser parserMock;
  @Mock private SelectionUpdater selectionUpdaterMock;

  @BeforeMethod
  public void setupTest() {
    MockitoAnnotations.initMocks(this);
  }

  @DataProvider
  public static Object[][] operatorWithUrl() {
    return new Object[][] {
      {RED_ZONE_SPORTS, "https://oddsfeed-redzonesports.sbtech.com/markets"},
      {SPORT_NATION, "https://oddsfeed-sportnation.sbtech.com/markets"}
    };
  }

  @Test(dataProvider = "operatorWithUrl")
  public void shouldCallRightUrl(SBTechOperatorType givenOperator, String expectedUrl)
      throws IOException {
    // given

    // when
    objectUnderTest =
        new SyncSelectionLineGroupIdOperation(
            givenOperator, postMethodCallMock, parserMock, selectionUpdaterMock);
    objectUnderTest.run();

    // then
    then(postMethodCallMock).should(times(1)).execute(eq(expectedUrl), any(), any());
  }

  @Test
  public void shouldBuildCriteria() throws IOException {
    // given
    LocalDate executionTime = LocalDate.now();
    HttpEntity givenBody = new StringEntity("body");
    given(parserMock.prepareRequest(any())).willReturn(givenBody);

    // when
    objectUnderTest =
        new SyncSelectionLineGroupIdOperation(SPORT_NATION, postMethodCallMock, parserMock, selectionUpdaterMock);
    objectUnderTest.run();

    // then
    then(postMethodCallMock).should(times(1)).execute(any(), eq(givenBody), any());
    ArgumentCaptor<GetMarketsCriteria> argument = ArgumentCaptor.forClass(GetMarketsCriteria.class);
    then(parserMock).should(times(1)).prepareRequest(argument.capture());

    GetMarketsCriteria actualCriteria = argument.getValue();

    assertThat(actualCriteria.getTimeFilterToDate()).isEqualTo(executionTime.plusDays(4));
    assertThat(actualCriteria.getIsOption()).isEqualTo(MainOption.MAIN);
    assertThat(actualCriteria.getIsLive()).isEqualTo(LiveOption.PRE_LIVE);
    assertThat(actualCriteria.isIncludeEachWay()).isFalse();

    List<MarketTypeRef> actualMarkets = actualCriteria.getMarketTypes();
    assertThat(actualMarkets).hasSize(17);
    assertThat(actualMarkets.stream().map(MarketTypeRef::getId).collect(Collectors.toList()))
        .containsExactlyElementsOf(
            Arrays.stream(SBTechMarketType.values())
                .map(SBTechMarketType::getSbtechId)
                .collect(Collectors.toList()));

    List<SportRef> actualSports = actualCriteria.getSports();
    assertThat(actualSports).hasSize(4);
    assertThat(actualSports.stream().map(SportRef::getId).collect(Collectors.toList()))
        .containsExactlyElementsOf(
            Arrays.stream(SBTechBranchType.values())
                .map(SBTechBranchType::getSbtechId)
                .collect(Collectors.toList()));
  }

  @Test
  public void shouldProcessResultAndSendToUpdate() throws IOException {
    // given
    InputStream givenResponseContent = new ByteArrayInputStream("response".getBytes());
    given(postMethodCallMock.execute(any(), any(), any()))
        .will(
            invocationOnMock -> {
              ((HttpCallResponseHandler) invocationOnMock.getArguments()[2])
                  .checkStatusAndConsumeResponse(constructSuccess(givenResponseContent));
              return true;
            });
    GetMarketsResponse givenResponse = new GetMarketsResponse();
    givenResponse.setSports(Collections.emptyList());
    given(parserMock.parseResponse(eq(givenResponseContent), any())).willReturn(givenResponse);

    // when
    objectUnderTest =
        new SyncSelectionLineGroupIdOperation(SPORT_NATION, postMethodCallMock, parserMock, selectionUpdaterMock);
    objectUnderTest.run();

    // then
    then(selectionUpdaterMock)
        .should(times(1))
        .updateLineGroupId(eq(givenResponse.getSports()), eq(SPORT_NATION));
  }
}
