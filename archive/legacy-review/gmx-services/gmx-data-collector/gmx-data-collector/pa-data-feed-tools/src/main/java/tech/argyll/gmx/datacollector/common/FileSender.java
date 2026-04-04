package tech.argyll.gmx.datacollector.common;

import java.io.IOException;
import java.io.InputStream;

public interface FileSender {

  void sendFile(String fileName, InputStream content) throws IOException;
}
