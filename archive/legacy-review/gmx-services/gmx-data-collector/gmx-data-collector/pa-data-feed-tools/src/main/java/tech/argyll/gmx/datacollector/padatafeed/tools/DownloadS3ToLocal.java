package tech.argyll.gmx.datacollector.padatafeed.tools;

import com.amazonaws.auth.profile.ProfileCredentialsProvider;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.gmx.datacollector.common.FileDownloader;
import tech.argyll.gmx.datacollector.common.S3Browser;
import tech.argyll.gmx.datacollector.padatafeed.S3NamingStrategy;

@Slf4j
public class DownloadS3ToLocal {

  private static final String s3Region = "eu-west-1";
  private static final String s3Bucket = "s3-repository-pa-feed";
  private static final AmazonS3 s3client = AmazonS3ClientBuilder.standard()
      .withCredentials(new ProfileCredentialsProvider("me_vidi_prod"))
      .withRegion(s3Region)
      .build();


  private static final S3NamingStrategy s3NamingStrategy = new S3NamingStrategy();
  private static final S3Browser s3browser = new S3Browser(s3client, s3Bucket, s3NamingStrategy);
  private static final FileDownloader downloader = new FileDownloader(s3client, s3Bucket);

  public static void main(String[] args) throws IOException {
    log.info("Begin");

    LocalDate from = LocalDate.of(2019, 3, 4);
    LocalDate to = LocalDate.now().plusDays(1);

    String dirPath = args[0];
    File targetDir = createTargetDir(dirPath);

    List<String> files = s3browser.loadFilesToProcess(from, to, targetDir);
    downloader.downloadFiles(files, targetDir);

    log.info("End");
  }

  private static File createTargetDir(String directoryName) {
    File directory = new File(directoryName);
    if (!directory.exists()) {
      directory.mkdirs();
    }
    return directory;
  }

}
