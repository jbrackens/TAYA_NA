package tech.argyll.gmx.datacollector.common;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class Index {

  private final File indexFile;

  public Index(File indexFile) {
    this.indexFile = indexFile;
  }

  public boolean exists() {
    return indexFile.exists();
  }

  public void keepInFile(List<String> results) {
    try {
      PrintStream fileStream = new PrintStream(indexFile);
      for (String filePath : results) {
        fileStream.println(filePath);
      }
      fileStream.close();
    } catch (FileNotFoundException e) {
      log.warn("Could not save index file", e);
    }
  }

  public List<String> loadFromFile() {
    try {
      List<String> files = Files.readAllLines(indexFile.toPath(), Charset.defaultCharset());
      log.info("Loaded {} items from index file {}", files.size(), indexFile.getName());
      return files;
    } catch (IOException e) {
      log.warn("Could not load index file", e);
      return new ArrayList<>();
    }
  }
}
