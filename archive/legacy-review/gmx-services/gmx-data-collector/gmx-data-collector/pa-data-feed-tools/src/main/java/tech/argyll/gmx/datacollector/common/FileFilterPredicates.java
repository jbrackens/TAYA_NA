package tech.argyll.gmx.datacollector.common;

import java.util.function.Predicate;
import org.apache.commons.io.FilenameUtils;

public class FileFilterPredicates {

  public static class NamePrefixCheck implements Predicate<String> {

    private final String prefix;

    public NamePrefixCheck(String prefix) {
      this.prefix = prefix;
    }

    @Override
    public boolean test(String path) {
      return FilenameUtils.getName(path).startsWith(prefix);
    }
  }

  public static class FilenameLengthCheck implements Predicate<String> {

    private final int length;

    public FilenameLengthCheck(int length) {
      this.length = length;
    }

    @Override
    public boolean test(String path) {
      return FilenameUtils.getName(path).length() == length;
    }
  }

}
