package tech.argyll.gmx.datacollector.common;

import java.io.IOException;
import java.io.InputStream;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;

@Slf4j
public class ToConsoleSender implements FileSender {

  @Override
  public void sendFile(String fileName, InputStream content) throws IOException {
    byte[] contentBytes = IOUtils.toByteArray(content);
    log.info(String.format("[%s] Sending file with content length: %s", fileName, contentBytes.length));
  }
}
