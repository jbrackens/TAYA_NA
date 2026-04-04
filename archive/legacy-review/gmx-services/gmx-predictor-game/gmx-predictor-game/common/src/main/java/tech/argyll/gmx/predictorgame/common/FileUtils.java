package tech.argyll.gmx.predictorgame.common;

import java.io.InputStream;

public class FileUtils {
  public static InputStream readToInputStream(String filePath) {
    return FileUtils.class.getClassLoader().getResourceAsStream(filePath);
  }
}
