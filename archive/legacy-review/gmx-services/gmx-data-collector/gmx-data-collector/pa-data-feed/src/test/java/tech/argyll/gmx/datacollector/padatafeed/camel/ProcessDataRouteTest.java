package tech.argyll.gmx.datacollector.padatafeed.camel;

import static org.mockito.BDDMockito.then;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static tech.argyll.gmx.datacollector.common.FileUtils.readToInputStream;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import lombok.Getter;
import org.apache.camel.CamelContext;
import org.apache.camel.EndpointInject;
import org.apache.camel.Processor;
import org.apache.camel.Produce;
import org.apache.camel.ProducerTemplate;
import org.apache.camel.builder.NotifyBuilder;
import org.apache.camel.component.mock.MockEndpoint;
import org.apache.camel.test.spring.CamelSpringBootRunner;
import org.apache.camel.test.spring.MockEndpoints;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelper;
import tech.argyll.gmx.datacollector.common.camel.MockHelper;
import tech.argyll.gmx.datacollector.padatafeed.FileType;
import tech.argyll.gmx.datacollector.padatafeed.PADataFeedApplication;
import tech.argyll.gmx.datacollector.padatafeed.camel.data.ProcessDataRoute;
import tech.argyll.gmx.datacollector.padatafeed.camel.data.SendToKafkaRoute;
import tech.argyll.gmx.datacollector.padatafeed.camel.image.ExtractImagesRoute;

@RunWith(CamelSpringBootRunner.class)
@SpringBootTest(classes = PADataFeedApplication.class)
@TestPropertySource(locations = "classpath:test.properties")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
@MockEndpoints
public class ProcessDataRouteTest implements MockHelper {

  @Getter
  @Autowired
  protected CamelContext camelContext;

  @Produce(uri = ProcessDataRoute.ENTRY_URI)
  protected ProducerTemplate processDataProducer;

  @EndpointInject(uri = "mock:storePNGEndpointMock")
  protected MockEndpoint storePNGEndpointMock;

  @Test
  public void shouldUntarSilksAndSendRightStructureToEndpoint() throws Exception {
    // given
    InputStream inputStream = readToInputStream("camel/s110118.tgz");

    Map<String, Object> headersMap = prepareFileHeaders(FileType.SILK, LocalDate.of(2018, 1, 11));

    replaceEndpointWith(ExtractImagesRoute.ROUTE_ID, ExtractImagesRoute.ENDPOINT_ID, storePNGEndpointMock);

    // when
    storePNGEndpointMock.expectedMessageCount(1);
    storePNGEndpointMock.expectedHeaderReceived(
        "CamelAwsS3Key", "horse-racing/silks/20180111/20180127aqu172001.png");
    storePNGEndpointMock.expectedHeaderReceived("CamelAwsS3CannedAcl", "PublicRead");
    storePNGEndpointMock.expectedHeaderReceived("CamelAwsS3ContentType", "image/png");

    processDataProducer.sendBodyAndHeaders(inputStream, headersMap);

    // then
    MockEndpoint.assertIsSatisfied(camelContext);
  }

  @Test
  public void shouldUntarSilksAndAllFilesToEndpoint() throws Exception {
    // given
    InputStream inputStream = readToInputStream("camel/s270118.tgz");

    Map<String, Object> headersMap = prepareFileHeaders(FileType.SILK, LocalDate.of(2018, 1, 27));

    replaceEndpointWith(ExtractImagesRoute.ROUTE_ID, ExtractImagesRoute.ENDPOINT_ID, storePNGEndpointMock);

    // when
    storePNGEndpointMock.expectedMessageCount(2238);

    processDataProducer.sendBodyAndHeaders(inputStream, headersMap);

    // then
    MockEndpoint.assertIsSatisfied(camelContext);
  }

  @Test
  public void shouldSplitRacecard() throws Exception {
    // given
    Processor finishProcessor = addMockAfter(SendToKafkaRoute.ROUTE_ID, SendToKafkaRoute.ENDPOINT_ID);
    Processor xmlToObjectMock = mockProcessor(SendToKafkaRoute.ROUTE_ID, SendToKafkaRoute.ENDPOINT_ID);
    NotifyBuilder notify = new NotifyBuilder(camelContext).whenDone(7).create();

    InputStream inputStream = readToInputStream("camel/c20180111ncs.xml");
    Map<String, Object> headersMap =
        prepareFileHeaders(FileType.RACE_CARD, LocalDate.of(2018, 7, 16));

    // when
    processDataProducer.sendBodyAndHeaders(inputStream, headersMap);

    // then
    MockEndpoint.assertIsSatisfied(camelContext);
    notify.matches(3, TimeUnit.SECONDS);

    then(xmlToObjectMock).should(times(7)).process(any());
    then(finishProcessor).should(times(7)).process(any());
  }

  @Test
  public void shouldFailDeliveryOnException() throws Exception {
    // given
    Processor finishProcessor = addMockAfter(SendToKafkaRoute.ROUTE_ID, SendToKafkaRoute.ENDPOINT_ID);
    Processor xmlToObjectMock = mockProcessor(SendToKafkaRoute.ROUTE_ID, SendToKafkaRoute.ENDPOINT_ID);
    setXMLProcessingFailureAttempts(xmlToObjectMock, 100);
    NotifyBuilder notify = new NotifyBuilder(camelContext).whenDone(1).create();

    InputStream inputStream = readToInputStream("camel/b20180111ncs17050003.xml");
    Map<String, Object> headersMap =
        prepareFileHeaders(FileType.BETTING, LocalDate.of(2018, 1, 11));

    // when
    processDataProducer.sendBodyAndHeaders(inputStream, headersMap);

    // then
    MockEndpoint.assertIsSatisfied(camelContext);
    notify.matches(3, TimeUnit.SECONDS);

    then(xmlToObjectMock).should(times(1)).process(any());
    then(finishProcessor).should(never()).process(any());
  }

  @Test
  public void shouldNotBlockProcessingWhenMultipleEvents() throws Exception {
    // given
    replaceEndpointWith(ExtractImagesRoute.ROUTE_ID, ExtractImagesRoute.ENDPOINT_ID, storePNGEndpointMock);
    Processor finishProcessor = addMockAfter(SendToKafkaRoute.ROUTE_ID, SendToKafkaRoute.ENDPOINT_ID);
    Processor xmlToObjectMock = mockProcessor(SendToKafkaRoute.ROUTE_ID, SendToKafkaRoute.ENDPOINT_ID);
    setXMLProcessingDelayedAttempts(xmlToObjectMock, 1);
    NotifyBuilder notify = new NotifyBuilder(camelContext).whenDone(2).create();

    InputStream blockingInput1 = readToInputStream("camel/c20180111ncs.xml");
    Map<String, Object> headersMap1 =
        prepareFileHeaders(FileType.BETTING, LocalDate.of(2018, 7, 16));

    InputStream notBlockingInput2 = readToInputStream("camel/s110118.tgz");
    Map<String, Object> headersMap2 = prepareFileHeaders(FileType.SILK, LocalDate.of(2018, 1, 11));

    InputStream notBlockingInput3 = readToInputStream("camel/b20180111ncs17050003.xml");
    Map<String, Object> headersMap3 =
        prepareFileHeaders(FileType.BETTING, LocalDate.of(2018, 1, 11));

    // when
    storePNGEndpointMock.expectedMessageCount(1);

    processDataProducer.sendBodyAndHeaders(blockingInput1, headersMap1);
    processDataProducer.sendBodyAndHeaders(notBlockingInput2, headersMap2);
    processDataProducer.sendBodyAndHeaders(notBlockingInput3, headersMap3);

    // then
    MockEndpoint.assertIsSatisfied(camelContext);
    notify.matches(3, TimeUnit.SECONDS);
    camelContext.stopRoute(ProcessDataRoute.ROUTE_ID, 1, TimeUnit.SECONDS, false);

    then(xmlToObjectMock).should(times(2)).process(any());
    then(finishProcessor).should(times(1)).process(any());
  }

  private void setXMLProcessingFailureAttempts(Processor processorMock, int failureAttempts) throws Exception {
    doAnswer(
        new Answer() {
          private int count = 0;

          public Void answer(InvocationOnMock invocation) {
            if (count++ < failureAttempts) {
              throw new NullPointerException();
            }
            return null;
          }
        })
        .when(processorMock)
        .process(any());
  }

  private void setXMLProcessingDelayedAttempts(Processor processorMock, int delayedAttempts) throws Exception {
    doAnswer(
        new Answer() {
          private int count = 0;

          public Void answer(InvocationOnMock invocation) throws InterruptedException {
            if (count++ < delayedAttempts) {
              Thread.sleep(1000 * 1000);
            }
            return null;
          }
        })
        .when(processorMock)
        .process(any());
  }

  private Map<String, Object> prepareFileHeaders(Object fileType, Object fileDate) {
    Map<String, Object> headersMap = new HashMap<>();
    headersMap.put(HeaderHelper.CUSTOM_FILE_TYPE_HEADER, fileType);
    headersMap.put(HeaderHelper.CUSTOM_FILE_DATE_HEADER, fileDate);
    return headersMap;
  }
}
