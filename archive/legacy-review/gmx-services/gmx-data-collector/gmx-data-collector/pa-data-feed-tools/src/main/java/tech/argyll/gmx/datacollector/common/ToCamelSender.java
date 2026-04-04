package tech.argyll.gmx.datacollector.common;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream;
import org.apache.http.client.fluent.Request;
import org.apache.http.client.fluent.Response;

@Slf4j
public class ToCamelSender implements FileSender {

  final String url;

  public ToCamelSender(String url) {
    this.url = url;
  }

  public void sendFile(File file) {
    String fileName = file.getName().replace(".gz", "");
    System.out.println(String.format("[%s] Start processing", fileName));

    try {
      InputStream is = new GzipCompressorInputStream(new FileInputStream(file));
      sendFile(fileName, is);
    } catch (IOException e) {
      log.error(String.format("[%s] Failed with exception", fileName), e);
    }

  }

  public void sendFile(String fileName, InputStream content) {
    String fileUrl = url + fileName;
    log.info(String.format("[%s] Sending file to URL %s", fileName, fileUrl));
    try {
      Response response = Request.Post(fileUrl)
          .bodyStream(content)
          .execute();

      int statusCode = response.returnResponse().getStatusLine().getStatusCode();
      if (statusCode != 200) {
        System.err.println(
            String.format("[%s] Failed with status '%s'", fileName, statusCode));
      }
    } catch (Exception e) {
      log.error(String.format("[%s] Failed with exception", fileName), e);
    }
  }
}
