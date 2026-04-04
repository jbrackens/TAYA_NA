package tech.argyll.gmx.datacollector.padatafeed.tools;

import java.io.File;
import java.io.FilenameFilter;
import java.util.Arrays;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.gmx.datacollector.common.ToCamelSender;
import tech.argyll.gmx.datacollector.padatafeed.S3NamingStrategy;

@Slf4j
public class SendLocalToFeed {

  static final FilenameFilter ACCEPTED_FILES = (dir, name) -> name.endsWith(S3NamingStrategy.S3_ARCHIVE_EXTENSION);

  private static final ToCamelSender sender = new ToCamelSender(Destination.URL_LOCAL);

  public static void main(String[] args) {
    String dirPath = args[0];

    List<File> files = listFiles(dirPath, ACCEPTED_FILES);

    files.forEach(sender::sendFile);
  }

  public static List<File> listFiles(String dirPath, FilenameFilter filter) {
    log.info("Loading files from {}", dirPath);

    File dir = new File(dirPath);
    if (!dir.exists()) {
      throw new IllegalArgumentException(String.format("There's no directory at %s", dirPath));
    }
    if (!dir.isDirectory()) {
      throw new IllegalArgumentException(
          String.format("The file at %s is not a directory", dirPath));
    }

    File[] files = dir.listFiles(filter);
    log.info("There are {} xml files", files.length);

    return Arrays.asList(files);
  }
}
