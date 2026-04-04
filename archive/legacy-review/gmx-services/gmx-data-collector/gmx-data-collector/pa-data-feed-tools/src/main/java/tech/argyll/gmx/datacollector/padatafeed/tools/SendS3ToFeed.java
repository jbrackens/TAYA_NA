package tech.argyll.gmx.datacollector.padatafeed.tools;

import com.amazonaws.auth.profile.ProfileCredentialsProvider;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.S3Object;
import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.zip.GZIPInputStream;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.gmx.datacollector.common.FileFilter;
import tech.argyll.gmx.datacollector.common.FileFilterPredicates.FilenameLengthCheck;
import tech.argyll.gmx.datacollector.common.FileFilterPredicates.NamePrefixCheck;
import tech.argyll.gmx.datacollector.common.FileSender;
import tech.argyll.gmx.datacollector.common.Index;
import tech.argyll.gmx.datacollector.common.S3Browser;
import tech.argyll.gmx.datacollector.common.ToCamelSender;
import tech.argyll.gmx.datacollector.padatafeed.S3NamingStrategy;

@Slf4j
public class SendS3ToFeed {

  private static final String s3Region = "eu-west-1";
  private static final String s3Bucket = "s3-repository-pa-feed";
  private static final AmazonS3 s3client = AmazonS3ClientBuilder.standard()
      .withCredentials(new ProfileCredentialsProvider("me_vidi_prod"))
      .withRegion(s3Region)
      .build();

  private static final String processedFilesIndex = "resendFiles.index";

  private static final S3NamingStrategy s3NamingStrategy = new S3NamingStrategy();
  private static final S3Browser s3browser = new S3Browser(s3client, s3Bucket, s3NamingStrategy);
  private static final FileSender sender = new ToCamelSender(Destination.URL_PROD_VIDI);
  //  private static final FileSender sender = new ToConsoleSender();
  private static final FileFilter filter = new FileFilter();

  public static void main(String[] args) throws IOException {
    log.info("Started");

    String dirPath = args[0];

    LocalDate from = LocalDate.of(2019, 3, 30);
    LocalDate to = from.plusDays(2);

    List<String> fileKeys = s3browser.findFileKeysWithinTimePeriod(from, to);

    fileKeys = filter.process(fileKeys,
        new NamePrefixCheck("c20190330").or(
            new FilenameLengthCheck(27).and(
                //new NamePrefixCheck("b20190304sth") // <- no raceId in DB
                new NamePrefixCheck("b20190305exe")
                    .or(new NamePrefixCheck("b20190306fon"))
                    .or(new NamePrefixCheck("b20190306kmp"))
                    //.or(new NamePrefixCheck("b20190307thu")) // <- contains mocked data
                    //.or(new NamePrefixCheck("b20190307cfc")) // <- no data from PA??
                    .or(new NamePrefixCheck("b20190308san"))
                    .or(new NamePrefixCheck("b20190308dun"))
                    .or(new NamePrefixCheck("b20190309san"))
                    .or(new NamePrefixCheck("b20190309kmp"))
                    .or(new NamePrefixCheck("b20190310naa"))
                    .or(new NamePrefixCheck("b20190311kmp"))
                    .or(new NamePrefixCheck("b20190311tau"))

                    .or(new NamePrefixCheck("b20190312che"))
                    .or(new NamePrefixCheck("b20190313che"))
                    .or(new NamePrefixCheck("b20190314che"))
                    .or(new NamePrefixCheck("b20190315che"))
            )));
    fileKeys.sort(Comparator.naturalOrder());
    resendFiles(dirPath, fileKeys);

    log.info("Done");
  }

  private static void resendFiles(String dirPath, List<String> fileKeys) throws IOException {
    log.info("Files to send: {}", fileKeys.size());

    Index index = new Index(new File(dirPath + File.separator + processedFilesIndex));

    List<String> sentFiles = index.loadFromFile();
    log.info("Loaded from index: {}", sentFiles.size());

    fileKeys.removeAll(sentFiles);
    log.info("NEW items: {}", fileKeys.size());

    fileKeys.forEach(
        key -> {
          try {
            S3Object o = s3client.getObject(s3Bucket, key);

            String file = s3NamingStrategy.extractFileName(key);
            log.info("Processing file '{}'", file);

            sender.sendFile(file, new GZIPInputStream(o.getObjectContent()));
          } catch (Exception e) {
            log.error("Error loading file from S3", e);
          }
        });

    sentFiles.addAll(fileKeys);
    log.info("Store files in index: {}", sentFiles.size());
    index.keepInFile(sentFiles);
  }
}
