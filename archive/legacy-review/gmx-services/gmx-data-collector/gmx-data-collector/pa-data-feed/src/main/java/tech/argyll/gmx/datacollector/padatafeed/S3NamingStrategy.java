package tech.argyll.gmx.datacollector.padatafeed;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class S3NamingStrategy {

  private static final DateTimeFormatter DATE_DIR_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

  public static final String S3_ARCHIVE_EXTENSION = ".gz";


  public String buildStorageDir(LocalDate fileDate) {
    String dateDirName;
    if (fileDate == null) {
      dateDirName = "unprocessable";
    } else {
      dateDirName = DATE_DIR_FORMAT.format(fileDate);
    }
    return String.format("pa-horseracing/%s/", dateDirName);
  }

  public String buildStoragePath(LocalDate fileDate, String fileName) {
    String storageDir = buildStorageDir(fileDate);
    return String.format("%s%s%s", storageDir, fileName, S3_ARCHIVE_EXTENSION);
  }


  public String extractFileName(String storagePath) {
    return storagePath.substring(
        storagePath.lastIndexOf("/") + 1,
        storagePath.length() - S3_ARCHIVE_EXTENSION.length());
  }
}
