package tech.argyll.gmx.datacollector.common.camel;

import java.time.LocalDate;
import javax.servlet.ServletRequest;
import org.apache.camel.Exchange;
import org.apache.camel.Message;
import org.apache.camel.dataformat.tarfile.TarIterator;
import tech.argyll.gmx.datacollector.padatafeed.FileType;

public interface HeaderHelper {

  String CAMEL_HTTP_PATH_HEADER = Exchange.HTTP_PATH;
  String CAMEL_HTTP_SERVLET_REQUEST_HEADER = Exchange.HTTP_SERVLET_REQUEST;
  String CAMEL_TARFILE_ENTRY_NAME_HEADER = TarIterator.TARFILE_ENTRY_NAME_HEADER;

  String FORWARDED_FOR_HEADER = "x-forwarded-for";

  String CUSTOM_FILE_NAME_HEADER = "CustomFileName";
  String CUSTOM_FILE_TYPE_HEADER = "CustomFileType";
  String CUSTOM_FILE_DATE_HEADER = "CustomFileDate";

  String CUSTOM_IMAGE_PATH_HEADER = "CustomImageStoragePath";

  ServletRequest getRequest(Message msg);

  String getForwardedFor(Message msg);

  String getPath(Message msg);

  String getTarEntryName(Message msg);

  String getFileName(Message msg);

  void setFileName(Message msg, String value);

  FileType getFileType(Message msg);

  void setFileType(Message msg, FileType value);

  LocalDate getFileDate(Message msg);

  void setFileDate(Message msg, LocalDate value);

  String getImageStoragePath(Message msg);

  void setImageStoragePath(Message msg, String value);
}
