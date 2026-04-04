package tech.argyll.gmx.datacollector.padatafeed.camel;

import static tech.argyll.gmx.datacollector.common.FileUtils.readToInputStream;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import lombok.Getter;
import org.apache.camel.CamelContext;
import org.apache.camel.EndpointInject;
import org.apache.camel.Produce;
import org.apache.camel.ProducerTemplate;
import org.apache.camel.component.mock.MockEndpoint;
import org.apache.camel.test.spring.CamelSpringBootRunner;
import org.apache.camel.test.spring.MockEndpoints;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelper;
import tech.argyll.gmx.datacollector.common.camel.MockHelper;
import tech.argyll.gmx.datacollector.padatafeed.FileType;
import tech.argyll.gmx.datacollector.padatafeed.PADataFeedApplication;
import tech.argyll.gmx.datacollector.padatafeed.camel.intake.StoreIntakeRoute;

@RunWith(CamelSpringBootRunner.class)
@SpringBootTest(classes = PADataFeedApplication.class)
@TestPropertySource(locations = "classpath:test.properties")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
@MockEndpoints
public class StoreIntakeRouteTest implements MockHelper {

  @Getter
  @Autowired
  protected CamelContext camelContext;

  @Produce(uri = StoreIntakeRoute.ENTRY_URI)
  protected ProducerTemplate storeIntakeProducer;

  @EndpointInject(uri = "mock:storeIntakeEndpointMock")
  protected MockEndpoint storeIntakeEndpointMock;

  @Test
  public void shouldSendBettingXMLToEndpoint() throws Exception {
    // given
    InputStream inputStream = readToInputStream("camel/b20180111ncs17050003.xml");

    Map<String, Object> headersMap =
        prepareFileHeaders("name.xml", FileType.BETTING, LocalDate.of(2018, 1, 11));

    replaceEndpointWith(StoreIntakeRoute.ROUTE_ID, StoreIntakeRoute.ENDPOINT_ID, storeIntakeEndpointMock);

    // when
    storeIntakeEndpointMock.expectedMessageCount(1);
    storeIntakeEndpointMock.expectedHeaderReceived(
        "CamelAwsS3Key", "pa-horseracing/20180111/name.xml.gz");
    storeIntakeEndpointMock.expectedHeaderReceived("CamelAwsS3CannedAcl", "Private");

    storeIntakeProducer.sendBodyAndHeaders(inputStream, headersMap);

    // then
    MockEndpoint.assertIsSatisfied(camelContext);
  }


  private Map<String, Object> prepareFileHeaders(
      String fileName, FileType fileType, LocalDate fileDate) {
    Map<String, Object> headersMap = new HashMap<>();
    headersMap.put(HeaderHelper.CUSTOM_FILE_NAME_HEADER, fileName);
    headersMap.put(HeaderHelper.CUSTOM_FILE_TYPE_HEADER, fileType);
    headersMap.put(HeaderHelper.CUSTOM_FILE_DATE_HEADER, fileDate);
    return headersMap;
  }
}
