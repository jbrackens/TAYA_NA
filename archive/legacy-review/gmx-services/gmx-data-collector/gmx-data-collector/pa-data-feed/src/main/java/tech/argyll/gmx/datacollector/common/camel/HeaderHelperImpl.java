package tech.argyll.gmx.datacollector.common.camel;

import java.time.LocalDate;
import javax.servlet.ServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Message;
import tech.argyll.gmx.datacollector.padatafeed.FileType;

/**
 * Provides utility functions for getting correctly typed values from Camel headers.
 */
@Slf4j
public class HeaderHelperImpl implements HeaderHelper {

  @Override
  public ServletRequest getRequest(Message msg) {
    return msg.getHeader(CAMEL_HTTP_SERVLET_REQUEST_HEADER, ServletRequest.class);
  }

  @Override
  public String getForwardedFor(Message msg) {
    return msg.getHeader(FORWARDED_FOR_HEADER, String.class);
  }

  @Override
  public String getPath(Message msg) {
    return msg.getHeader(CAMEL_HTTP_PATH_HEADER, String.class);
  }

  @Override
  public String getTarEntryName(Message msg) {
    return msg.getHeader(CAMEL_TARFILE_ENTRY_NAME_HEADER, String.class);
  }

  @Override
  public String getFileName(Message msg) {
    return msg.getHeader(CUSTOM_FILE_NAME_HEADER, String.class);
  }

  @Override
  public void setFileName(Message msg, String value) {
    msg.setHeader(CUSTOM_FILE_NAME_HEADER, value);
  }

  @Override
  public FileType getFileType(Message msg) {
    return msg.getHeader(CUSTOM_FILE_TYPE_HEADER, FileType.class);
  }

  @Override
  public void setFileType(Message msg, FileType value) {
    msg.setHeader(CUSTOM_FILE_TYPE_HEADER, value);
  }

  @Override
  public LocalDate getFileDate(Message msg) {
    return msg.getHeader(CUSTOM_FILE_DATE_HEADER, LocalDate.class);
  }

  @Override
  public void setFileDate(Message msg, LocalDate value) {
    msg.setHeader(CUSTOM_FILE_DATE_HEADER, value);
  }

  @Override
  public String getImageStoragePath(Message msg) {
    return msg.getHeader(CUSTOM_IMAGE_PATH_HEADER, String.class);
  }

  @Override
  public void setImageStoragePath(Message msg, String value) {
    msg.setHeader(CUSTOM_IMAGE_PATH_HEADER, value);
  }
}
