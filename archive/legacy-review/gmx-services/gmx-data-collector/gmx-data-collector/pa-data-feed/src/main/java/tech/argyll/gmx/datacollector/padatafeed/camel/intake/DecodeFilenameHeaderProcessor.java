package tech.argyll.gmx.datacollector.padatafeed.camel.intake;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.Value;
import org.apache.camel.Exchange;
import org.springframework.stereotype.Component;
import tech.argyll.gmx.datacollector.common.camel.AbstractHeaderProcessor;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelper;
import tech.argyll.gmx.datacollector.padatafeed.FileType;

@Component
public class DecodeFilenameHeaderProcessor extends AbstractHeaderProcessor {

  private static final Pattern BETTING_FILE_NAME_PATTERN = Pattern.compile("b(\\d{8}).*\\.xml");
  private static final Pattern RACE_CARD_FILE_NAME_PATTERN = Pattern.compile("c(\\d{8}).*\\.xml");
  private static final DateTimeFormatter DATA_FILE_DATE_FORMAT =
      DateTimeFormatter.ofPattern("yyyyMMdd");

  private static final Pattern IMAGE_ARCHIVE_NAME_PATTERN = Pattern.compile("s(\\d{6}).*\\.tgz");
  private static final DateTimeFormatter IMAGE_ARCHIVE_DATE_FORMAT =
      DateTimeFormatter.ofPattern("ddMMyy");

  private static final FileNameParsed UNKNOWN_FILE = new FileNameParsed(null, null);
  private final Map<Pattern, Function<String, FileNameParsed>> pattern2processor;

  private final HeaderHelper headers;

  public DecodeFilenameHeaderProcessor(HeaderHelper headers) {
    this.headers = headers;
    this.pattern2processor = new HashMap<>();
    pattern2processor.put(
        BETTING_FILE_NAME_PATTERN, s -> new FileNameParsed(FileType.BETTING, parseDateFromDataFile(s)));
    pattern2processor.put(
        RACE_CARD_FILE_NAME_PATTERN,
        s -> new FileNameParsed(FileType.RACE_CARD, parseDateFromDataFile(s)));
    pattern2processor.put(
        IMAGE_ARCHIVE_NAME_PATTERN,
        s -> new FileNameParsed(FileType.SILK, parseDateFromImagesArchive(s)));
  }

  @Override
  public void doProcess(Exchange exchange) throws Exception {
    String fileName = headers.getPath(exchange.getIn());

    FileNameParsed typeAndDate = processFile(fileName);

    headers.setFileName(exchange.getOut(), fileName);
    headers.setFileType(exchange.getOut(), typeAndDate.type);
    headers.setFileDate(exchange.getOut(), typeAndDate.date);
  }

  private FileNameParsed processFile(String fileName) {
    for (Map.Entry<Pattern, Function<String, FileNameParsed>> entry :
        pattern2processor.entrySet()) {
      Matcher matcher = entry.getKey().matcher(fileName);
      if (matcher.find()) {
        try {
          return entry.getValue().apply(matcher.group(1));
        } catch (Exception e) {
          return UNKNOWN_FILE;
        }
      }
    }
    return UNKNOWN_FILE;
  }

  private LocalDate parseDateFromDataFile(String input) {
    return LocalDate.parse(input, DATA_FILE_DATE_FORMAT);
  }

  private LocalDate parseDateFromImagesArchive(String input) {
    return LocalDate.parse(input, IMAGE_ARCHIVE_DATE_FORMAT);
  }

  @Value
  private static class FileNameParsed {

    private FileType type;
    private LocalDate date;
  }
}
