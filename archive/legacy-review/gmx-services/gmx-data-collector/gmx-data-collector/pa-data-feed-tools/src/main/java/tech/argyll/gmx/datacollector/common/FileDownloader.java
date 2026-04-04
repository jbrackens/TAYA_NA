package tech.argyll.gmx.datacollector.common;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.AmazonS3Exception;
import com.amazonaws.services.s3.model.S3Object;
import com.google.common.io.ByteStreams;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;

@Slf4j
public class FileDownloader {

  private final AmazonS3 s3client;
  private final String s3Bucket;

  public FileDownloader(AmazonS3 s3client, String s3Bucket) {
    this.s3client = s3client;
    this.s3Bucket = s3Bucket;
  }

  public void downloadFiles(List<String> files, File targetDir) {
    files.parallelStream().forEach(filePath -> processFile(filePath, targetDir));
  }

  private void processFile(String filePath, File targetDir) {
    File targetFile = new File(targetDir, filePath);

    if (targetFile.exists()) {
      log.info("Skipping existing file: {}", filePath);
    } else {
      downloadFromS3(filePath, targetFile);
    }
  }

  private void downloadFromS3(String filePath, File targetFile) {
    log.info("Downloading file: {}", filePath);

    try {
      S3Object o = s3client.getObject(s3Bucket, filePath);
      log.info("Storing file: {}", filePath);
      createWriteFile(o.getObjectContent(), targetFile);
    } catch (AmazonS3Exception e) {
      log.error("Error loading file from S3", e);
    }
  }

  private void createWriteFile(InputStream content, File targetFile) {
    try {
      FileUtils.forceMkdir(targetFile.getParentFile());
    } catch (IOException e) {
      log.error("Error creating directory", e);
    }

    try {
      OutputStream os = new FileOutputStream(targetFile);
      ByteStreams.copy(content, os);
      content.close();
      os.close();
    } catch (IOException e) {
      log.error("Error writing XML", e);
    }
  }
}
