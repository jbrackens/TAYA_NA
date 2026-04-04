package tech.argyll.video.datafeed.oddsfeed.markets;

import static org.assertj.core.api.Assertions.assertThat;
import static tech.argyll.video.common.FileUtils.readToInputStream;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.apache.http.HttpEntity;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.config.DataFeedModule;
import tech.argyll.video.datafeed.oddsfeed.LiveOption;
import tech.argyll.video.datafeed.oddsfeed.MainOption;
import tech.argyll.video.datafeed.oddsfeed.MarketTypeRef;
import tech.argyll.video.datafeed.oddsfeed.OddsFeedParser;
import tech.argyll.video.datafeed.oddsfeed.SportRef;
import tech.argyll.video.datafeed.oddsfeed.markets.model.Game;
import tech.argyll.video.datafeed.oddsfeed.markets.model.League;
import tech.argyll.video.datafeed.oddsfeed.markets.model.Line;
import tech.argyll.video.datafeed.oddsfeed.markets.model.Market;
import tech.argyll.video.datafeed.oddsfeed.markets.model.Sport;

public class GetMarketsParserTest {
  private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

  private OddsFeedParser objectUnderTest;

  @BeforeClass
  public void setupClass() {
    objectUnderTest = new OddsFeedParser(new DataFeedModule(SBTechOperatorType.SPORT_NATION).buildObjectMapper());
  }

  @Test
  public void shouldPrepareRequest() throws IOException {
    // given
    GetMarketsCriteria criteria =
        new GetMarketsCriteria(
            LocalDate.now().minusDays(10),
            MainOption.BOTH,
            LiveOption.LIVE,
            true,
            Arrays.asList(new MarketTypeRef(100L), new MarketTypeRef(505L)),
            Arrays.asList(new SportRef(321L), new SportRef(709L)));

    // when
    HttpEntity actual = objectUnderTest.prepareRequest(criteria);

    // then
    assertThat(actual.getContentType().getValue()).isEqualTo("application/json; charset=UTF-8");

    DocumentContext actualCriteria = JsonPath.parse(actual.getContent());

    assertThat(actualCriteria.read("TimeFilterToDate", String.class))
        .isEqualTo(DATE_FORMATTER.format(criteria.getTimeFilterToDate()));
    assertThat(actualCriteria.read("IsOption", Integer.class)).isEqualTo(null);
    assertThat(actualCriteria.read("IsLive", Integer.class)).isEqualTo(1);
    assertThat(actualCriteria.read("IncludeEachWay", Integer.class)).isEqualTo(1);
    List<Integer> actualMarkets = actualCriteria.read("MarketTypes..Id");
    assertThat(actualMarkets).hasSize(2);
    assertThat(actualMarkets).containsExactly(100, 505);

    List<Integer> actualSports = actualCriteria.read("Sports..Id");
    assertThat(actualSports).hasSize(2);
    assertThat(actualSports).containsExactly(321, 709);
  }

  @Test
  public void shouldParseAllFieldsResponse() throws IOException {
    // TODO add all fields from documentation to JSON
    // given
    InputStream jsonToParse = readToInputStream("oddsfeed/markets/allFieldsResponse.json");
    List<Sport> expectedResult =
        Collections.singletonList(
            new Sport(
                1L,
                Collections.singletonList(
                    new League(
                        39853L,
                        Collections.singletonList(
                            new Game(
                                9431240L,
                                (byte) 0,
                                Collections.singletonList(
                                    new Market(
                                        1570002L,
                                        Collections.singletonList(
                                            new Line("R346331458", 346331458L, 49502957L))))))))));

    // when
    GetMarketsResponse actual =
        objectUnderTest.parseResponse(jsonToParse, GetMarketsResponse.class);

    // then
    assertThat(actual.getCode()).isEqualTo(0);
    assertThat(actual.getMessage()).isNull();
    assertThat(actual.getSports()).containsExactlyElementsOf(expectedResult);
  }

  @Test
  public void shouldParseMultipleGamesResponse() throws IOException {
    // given
    InputStream jsonToParse = readToInputStream("oddsfeed/markets/multipleGamesResponse.json");
    List<Sport> expectedResult =
        Arrays.asList(
            new Sport(
                1L,
                Arrays.asList(
                    new League(
                        39853L,
                        Collections.singletonList(
                            new Game(
                                9431240L,
                                (byte) 0,
                                Arrays.asList(
                                    new Market(
                                        1570002L,
                                        Arrays.asList(
                                            new Line("R346331458", 346331458L, 49502957L),
                                            new Line("R346331462", 346331462L, 49502957L))),
                                    new Market(
                                        1L,
                                        Arrays.asList(
                                            new Line("R346327418", 346327418L, 49502380L),
                                            new Line("R346327421", 346327421L, 49502380L),
                                            new Line("R346327422", 346327422L, 49502380L))),
                                    new Market(
                                        610011L,
                                        Arrays.asList(
                                            new Line("Q463831930_39853", 463831930L, null),
                                            new Line("Q463831931_39853", 463831931L, null),
                                            new Line("Q463831932_39853", 463831932L, null))))))),
                    new League(
                        40685L,
                        Arrays.asList(
                            new Game(
                                9332871L,
                                (byte) 0,
                                Arrays.asList(
                                    new Market(
                                        1L,
                                        Arrays.asList(
                                            new Line("R341310469", 341310469L, 48785596L),
                                            new Line("R341310472", 341310472L, 48785596L),
                                            new Line("R341310473", 341310473L, 48785596L))),
                                    new Market(
                                        2L,
                                        Arrays.asList(
                                            new Line("R341310470", 341310470L, 48785596L),
                                            new Line("R341310474", 341310474L, 48785596L))),
                                    new Market(
                                        3L,
                                        Arrays.asList(
                                            new Line("R341310471", 341310471L, 48785596L),
                                            new Line("R341310475", 341310475L, 48785596L))),
                                    new Market(
                                        1570002L,
                                        Arrays.asList(
                                            new Line("R341310890", 341310890L, 48785656L),
                                            new Line("R341310894", 341310894L, 48785656L))),
                                    new Market(
                                        610011L,
                                        Arrays.asList(
                                            new Line("Q457535135_40685", 457535135L, null),
                                            new Line("Q457535136_40685", 457535136L, null),
                                            new Line("Q457535137_40685", 457535137L, null))),
                                    new Market(
                                        1580013L,
                                        Arrays.asList(
                                            new Line("Q457607874_40685", 457607874L, null),
                                            new Line("Q457607875_40685", 457607875L, null))))),
                            new Game(
                                9332948L,
                                (byte) 0,
                                Arrays.asList(
                                    new Market(
                                        1570002L,
                                        Arrays.asList(
                                            new Line("R341315811", 341315811L, 48786359L),
                                            new Line("R341315815", 341315815L, 48786359L))),
                                    new Market(
                                        1L,
                                        Arrays.asList(
                                            new Line("R341314774", 341314774L, 48786211L),
                                            new Line("R341314777", 341314777L, 48786211L),
                                            new Line("R341314778", 341314778L, 48786211L))),
                                    new Market(
                                        2L,
                                        Arrays.asList(
                                            new Line("R341314775", 341314775L, 48786211L),
                                            new Line("R341314779", 341314779L, 48786211L))),
                                    new Market(
                                        3L,
                                        Arrays.asList(
                                            new Line("R341314776", 341314776L, 48786211L),
                                            new Line("R341314780", 341314780L, 48786211L))),
                                    new Market(
                                        610011L,
                                        Arrays.asList(
                                            new Line("Q457539480_40685", 457539480L, null),
                                            new Line("Q457539481_40685", 457539481L, null),
                                            new Line("Q457539482_40685", 457539482L, null))),
                                    new Market(
                                        1580013L,
                                        Arrays.asList(
                                            new Line("Q457607586_40685", 457607586L, null),
                                            new Line("Q457607587_40685", 457607587L, null))))))))),
            new Sport(
                61L,
                Collections.singletonList(
                    new League(
                        112619L,
                        Collections.singletonList(
                            new Game(
                                40319029L,
                                (byte) 1,
                                Arrays.asList(
                                    new Market(
                                        3410024L,
                                        Arrays.asList(
                                            new Line("Q464205801_112619", 464205801L, null),
                                            new Line("Q464205811_112619", 464205811L, null),
                                            new Line("Q464205819_112619", 464205819L, null),
                                            new Line("Q464205827_112619", 464205827L, null),
                                            new Line("Q464205835_112619", 464205835L, null),
                                            new Line("Q464205843_112619", 464205843L, null))),
                                    new Market(
                                        3410026L,
                                        Collections.singletonList(
                                            new Line("Q464205806_112619", 464205806L, null))),
                                    new Market(
                                        3410028L,
                                        Collections.singletonList(
                                            new Line(
                                                "Q464205807_112619", 464205807L, null))))))))));

    // when
    GetMarketsResponse actual =
        objectUnderTest.parseResponse(jsonToParse, GetMarketsResponse.class);

    // then
    assertThat(actual.getCode()).isEqualTo(0);
    assertThat(actual.getMessage()).isNull();
    assertThat(actual.getSports()).containsExactlyElementsOf(expectedResult);
  }
}
