package tech.argyll.video.datafeed.oddsfeed.markets;

import tech.argyll.video.datafeed.AbstractDataFeedDBTest;

public class SelectionUpdaterTest extends AbstractDataFeedDBTest {
  // TODO fix test for new feed: https://flipsports.atlassian.net/browse/GM-1653
//
//  private SoccerBranchProcessor soccerBranchProcessor;
//  private OddsFeedParser getMarketsParser;
//  private SelectionDao selectionDao;
//
//  private SelectionUpdater objectUnderTest;
//
//  @BeforeClass
//  public void setupClass() {
//    setupInjector(new DataFeedModule());
//    soccerBranchProcessor = injector.getInstance(SoccerBranchProcessor.class);
//    getMarketsParser = injector.getInstance(OddsFeedParser.class);
//    selectionDao = injector.getInstance(SelectionDao.class);
//
//    objectUnderTest = injector.getInstance(SelectionUpdater.class);
//  }
//
//  @Test
//  public void shouldUpdateSinglePartner() throws IOException {
//    // given
//    InputStream givenEvents = readToInputStream("oddsfeed/markets/simpleEvents.xml");
//    soccerBranchProcessor.process(UUID.uuid(), givenEvents, RED_ZONE_SPORTS, FRACTIONAL);
//    givenEvents = readToInputStream("oddsfeed/markets/simpleEvents.xml");
//    soccerBranchProcessor.process(UUID.uuid(), givenEvents, SPORT_NATION, FRACTIONAL);
//
//    InputStream givenResponse = readToInputStream("oddsfeed/markets/simpleResponse.json");
//    GetMarketsResponse givenSports =
//        getMarketsParser.parseResponse(givenResponse, GetMarketsResponse.class);
//
//    // when
//    SelectionUpdaterStats actual =
//        objectUnderTest.updateLineGroupId(givenSports.getSports(), RED_ZONE_SPORTS);
//
//    assertThat(actual.getInvalidCount()).isEqualTo(0);
//    assertThat(actual.getNotFoundCount()).isEqualTo(0);
//    assertThat(actual.getUnchangedCount()).isEqualTo(0);
//    assertThat(actual.getUpdatedCount()).isEqualTo(1);
//
//    SelectionModel selection = findSelection(RED_ZONE_SPORTS, "R346331458");
//    checkGroupId(selection, "49502957");
//    selection = findSelection(SPORT_NATION, "R346331458");
//    checkGroupId(selection, null);
//  }
//
//  @Test
//  public void shouldUpdateLineGroupId() throws IOException {
//    // given
//    InputStream givenEvents = readToInputStream("oddsfeed/markets/selectionUpdaterGivenEvents.xml");
//    soccerBranchProcessor.process(UUID.uuid(), givenEvents, RED_ZONE_SPORTS, FRACTIONAL);
//
//    changeGroupId("R343779951", RED_ZONE_SPORTS, "49138414");
//    changeGroupId("R343779955", RED_ZONE_SPORTS, "49138414");
//
//    InputStream givenResponse =
//        readToInputStream("oddsfeed/markets/selectionUpdaterGivenResponse.json");
//    GetMarketsResponse givenSports =
//        getMarketsParser.parseResponse(givenResponse, GetMarketsResponse.class);
//
//    // when
//    SelectionUpdaterStats actual =
//        objectUnderTest.updateLineGroupId(givenSports.getSports(), RED_ZONE_SPORTS);
//
//    // then
//    assertThat(actual.getInvalidCount()).isEqualTo(5);
//    assertThat(actual.getNotFoundCount()).isEqualTo(4);
//    assertThat(actual.getUnchangedCount()).isEqualTo(2);
//    assertThat(actual.getUpdatedCount()).isEqualTo(3);
//
//    Function2<SBTechOperatorType, String, SelectionModel> findSelection = this::findSelection;
//    Function1<String, SelectionModel> findSelectionForPartner =
//        findSelection.apply(RED_ZONE_SPORTS);
//
//    checkGroupId(findSelectionForPartner.apply("R343778018"), "49138138");
//    checkGroupId(findSelectionForPartner.apply("R343778021"), "49138138");
//    checkGroupId(findSelectionForPartner.apply("R343778022"), "49138138");
//    assertThat(findSelectionForPartner.apply("R343778019")).isNull();
//    assertThat(findSelectionForPartner.apply("R343778023")).isNull();
//    assertThat(findSelectionForPartner.apply("R343778020")).isNull();
//    assertThat(findSelectionForPartner.apply("R343778024")).isNull();
//    checkGroupId(findSelectionForPartner.apply("R343779951"), "49138414");
//    checkGroupId(findSelectionForPartner.apply("R343779955"), "49138414");
//    checkGroupId(findSelectionForPartner.apply("Q460682301_40145"), null);
//    checkGroupId(findSelectionForPartner.apply("Q460682302_40145"), null);
//    checkGroupId(findSelectionForPartner.apply("Q460682303_40145"), null);
//    checkGroupId(findSelectionForPartner.apply("Q463226874_40145"), null);
//    checkGroupId(findSelectionForPartner.apply("Q463226875_40145"), null);
//  }
//
//  private void changeGroupId(String lineId, SBTechOperatorType operatorType, String groupId) {
//    SelectionModel selection = findSelection(operatorType, lineId);
//    selection.setGroupId(groupId);
//    selection.update();
//  }
//
//  private SelectionModel findSelection(SBTechOperatorType operator, String refId) {
//    return selectionDao.findByRefIdAndPartner(refId, operator.getPartnerType());
//  }
//
//  public static void checkGroupId(SelectionModel actual, String expectedGroupId) {
//    assertThat(actual).isNotNull();
//    assertThat(actual.getGroupId()).isEqualTo(expectedGroupId);
//  }
}
