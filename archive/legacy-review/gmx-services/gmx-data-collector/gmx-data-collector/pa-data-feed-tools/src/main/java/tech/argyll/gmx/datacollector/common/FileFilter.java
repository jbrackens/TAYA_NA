package tech.argyll.gmx.datacollector.common;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;

@Slf4j
public class FileFilter {

  public List<String> process(List<String> files, Predicate<? super String> predicate) {
    log.info("Before filter '{}' files", files.size());

    Map<String, List<String>> groupedPaths = groupRelated(files);
    log.info("Created groups '{}'", groupedPaths.size());

    List<String> filtered = groupedPaths
        .entrySet()
        .parallelStream()
        .map(this::pickLast)
        .filter(predicate)
        .collect(Collectors.toList());
    log.info("After filtering '{}'", filtered.size());

    return filtered;
  }

  private Map<String, List<String>> groupRelated(List<String> files) {
    return files
        .stream()
        .collect(Collectors.groupingByConcurrent(this::timestampPart));
  }

  private String timestampPart(String file) {
    String name = FilenameUtils.getBaseName(file);
    if (!name.startsWith("b")) {
      return name;
    } else {
      return name.substring(0, 16);
    }
  }

  private String pickLast(Map.Entry<String, List<String>> filesGrouped) {
    List<String> files = filesGrouped.getValue();
    files.sort(Comparator.naturalOrder());
    return files.get(files.size() - 1);
  }
}
