package tech.argyll.gmx.datacollector.padatafeed.camel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.doReturn;

import com.tngtech.java.junit.dataprovider.DataProvider;
import com.tngtech.java.junit.dataprovider.DataProviderRunner;
import com.tngtech.java.junit.dataprovider.UseDataProvider;
import org.apache.camel.Exchange;
import org.apache.camel.Message;
import org.apache.camel.impl.DefaultCamelContext;
import org.apache.camel.impl.DefaultExchange;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.MockitoAnnotations;
import org.mockito.Spy;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelperImpl;
import tech.argyll.gmx.datacollector.padatafeed.FileType;
import tech.argyll.gmx.datacollector.padatafeed.camel.intake.DecodeFilenameHeaderProcessor;

@RunWith(DataProviderRunner.class)
public class FileNameProcessorTest {

  private DecodeFilenameHeaderProcessor objectUnderTest;

  @Spy
  private HeaderHelperImpl headerHelperMock;

  @Before
  public void setupTest() {
    MockitoAnnotations.initMocks(this);

    objectUnderTest = new DecodeFilenameHeaderProcessor(headerHelperMock);
  }

  @Test
  @UseDataProvider("acceptedFiles")
  public void shouldParseAcceptedFile(String givenFile, FileType expectedType, String expectedDate)
      throws Exception {
    // given
    Exchange givenExchange = new DefaultExchange(new DefaultCamelContext());
    doReturn(givenFile).when(headerHelperMock).getPath(any(Message.class));

    // when
    objectUnderTest.process(givenExchange);

    // then
    assertThat(headerHelperMock.getFileName(givenExchange.getOut())).isEqualTo(givenFile);
    assertThat(headerHelperMock.getFileType(givenExchange.getOut())).isEqualTo(expectedType);
    assertThat(headerHelperMock.getFileDate(givenExchange.getOut())).isEqualTo(expectedDate);
  }

  @DataProvider
  public static Object[][] acceptedFiles() {
    return new Object[][]{
        {"b20180119ncs20450002.xml", FileType.BETTING, "2018-01-19"},
        {"c20180121thu.xml", FileType.RACE_CARD, "2018-01-21"},
        {"s160118.tgz", FileType.SILK, "2018-01-16"}
    };
  }

  @Test
  @UseDataProvider("notAcceptedFiles")
  public void shouldMarkNotAcceptedFile(String givenFile) throws Exception {
    // given
    Exchange givenExchange = new DefaultExchange(new DefaultCamelContext());
    doReturn(givenFile).when(headerHelperMock).getPath(any(Message.class));

    // when
    objectUnderTest.process(givenExchange);

    // then
    assertThat(headerHelperMock.getFileName(givenExchange.getOut())).isEqualTo(givenFile);
    assertThat(headerHelperMock.getFileType(givenExchange.getOut())).isNull();
    assertThat(headerHelperMock.getFileDate(givenExchange.getOut())).isNull();
  }

  @DataProvider
  public static Object[][] notAcceptedFiles() {
    return new Object[][]{
        {""},
        {"a20180119ncs20450002.xml"},
        {"b20180119ncs20450002"},
        {"b2018.xml"},
        {"b99999999ncs20450002.xml"},
        {"c20180121thu"},
        {"c201801.xml"},
        {"c99999999thu.xml"},
        {"s160118"},
        {"s1601.tgz"},
        {"s999999.tgz"},
    };
  }
}
