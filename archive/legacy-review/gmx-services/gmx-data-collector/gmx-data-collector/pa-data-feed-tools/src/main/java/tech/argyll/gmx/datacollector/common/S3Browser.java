package tech.argyll.gmx.datacollector.common;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ListObjectsV2Request;
import com.amazonaws.services.s3.model.ListObjectsV2Result;
import com.amazonaws.services.s3.model.S3ObjectSummary;
import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.LinkedList;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.gmx.datacollector.padatafeed.S3NamingStrategy;

@Slf4j
public class S3Browser {

  private static final String processedFilesIndex = "s3Files.index";

  private final AmazonS3 s3client;
  private final String s3Bucket;
  private final S3NamingStrategy s3NamingStrategy;

  public S3Browser(AmazonS3 s3client, String s3Bucket, S3NamingStrategy s3NamingStrategy) {
    this.s3client = s3client;
    this.s3Bucket = s3Bucket;
    this.s3NamingStrategy = s3NamingStrategy;
  }

  public List<String> loadFilesToProcess(LocalDate from, LocalDate to, File targetDir) throws IOException {
    Index index = new Index(new File(targetDir.getAbsolutePath() + File.separator + processedFilesIndex));
    if (index.exists()) {
      return index.loadFromFile();
    } else {
      List<String> files = findFileKeysWithinTimePeriod(from, to);
      index.keepInFile(files);
      return files;
    }
  }

  public List<String> findFileKeysWithinTimePeriod(LocalDate from, LocalDate to) {
    List<String> result = new LinkedList<>();
    for (LocalDate date = from; date.isBefore(to); date = date.plusDays(1)) {
      result.addAll(findFileKeysForDate(date));
      log.info("Aggregated '{}' results", result.size());
    }
    log.info("Found {} items for specified time period", result.size());
    return result;
  }

  private List<String> findFileKeysForDate(LocalDate date) {
    String prefix = s3NamingStrategy.buildStorageDir(date);
    log.info("Loading from prefix {}", prefix);
    List<S3ObjectSummary> result = new LinkedList<>();

    ListObjectsV2Request req = new ListObjectsV2Request().withBucketName(s3Bucket).withPrefix(prefix).withMaxKeys(1000);
    ListObjectsV2Result res;
    do {
      res = s3client.listObjectsV2(req);

      result.addAll(res.getObjectSummaries());

      log.info("'{}' results", result.size());

      String token = res.getNextContinuationToken();
      req.setContinuationToken(token);
    } while (res.isTruncated());

    return result
        .stream()
        .map(S3ObjectSummary::getKey)
        .collect(Collectors.toList());
  }
}
