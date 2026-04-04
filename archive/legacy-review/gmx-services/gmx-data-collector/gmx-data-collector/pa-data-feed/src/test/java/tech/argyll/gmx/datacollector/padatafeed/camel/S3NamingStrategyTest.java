package tech.argyll.gmx.datacollector.padatafeed.camel;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.java.junit.dataprovider.DataProvider;
import com.tngtech.java.junit.dataprovider.DataProviderRunner;
import com.tngtech.java.junit.dataprovider.UseDataProvider;
import java.time.LocalDate;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;
import tech.argyll.gmx.datacollector.padatafeed.S3NamingStrategy;

@RunWith(DataProviderRunner.class)
public class S3NamingStrategyTest {

  private static S3NamingStrategy objectUnderTest;

  @BeforeClass
  public static void setupTest() {
    objectUnderTest = new S3NamingStrategy();
  }

  @Test
  @UseDataProvider("storageDirDataProvider")
  public void shouldBuildStorageDir(LocalDate givenDate, String expectedDir)
      throws Exception {
    // given

    // when
    String actual = objectUnderTest.buildStorageDir(givenDate);

    // then
    assertThat(actual).isEqualTo(expectedDir);
  }

  @DataProvider
  public static Object[][] storageDirDataProvider() {
    return new Object[][]{
        {null, "pa-horseracing/unprocessable/"},
        {LocalDate.of(2019, 2, 19), "pa-horseracing/20190219/"},
        {LocalDate.of(2018, 12, 31), "pa-horseracing/20181231/"}
    };
  }

  @Test
  @UseDataProvider("storagePathDataProvider")
  public void shouldBuildStoragePath(LocalDate givenDate, String givenFileName, String expectedPath)
      throws Exception {
    // given

    // when
    String actual = objectUnderTest.buildStoragePath(givenDate, givenFileName);

    // then
    assertThat(actual).isEqualTo(expectedPath);
  }

  @DataProvider
  public static Object[][] storagePathDataProvider() {
    return new Object[][]{
        {LocalDate.of(2018, 1, 19), "b20180119ncs20450002.xml", "pa-horseracing/20180119/b20180119ncs20450002.xml.gz"},
        {LocalDate.of(2018, 1, 21), "c20180121thu.xml", "pa-horseracing/20180121/c20180121thu.xml.gz"}
    };
  }

  @Test
  @UseDataProvider("extractFileNameDataProvider")
  public void shouldBuildStoragePath(String givenPath, String expected)
      throws Exception {
    // given

    // when
    String actual = objectUnderTest.extractFileName(givenPath);

    // then
    assertThat(actual).isEqualTo(expected);
  }

  @DataProvider
  public static Object[][] extractFileNameDataProvider() {
    return new Object[][]{
        {"pa-horseracing/20180119/b20180119ncs20450002.xml.gz", "b20180119ncs20450002.xml"},
        {"pa-horseracing/20180121/c20180121thu.xml.gz", "c20180121thu.xml"}
    };
  }

}
