package tech.argyll.gmx.datacollector.common.assets;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class AssetsURLBuilder {

  private static final DateTimeFormatter DATE_DIR_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

  public String buildHorseRacingSilkPath(ZonedDateTime eventDate) {
    return String.format(
        "horse-racing/silks/%s", DATE_DIR_FORMAT.format(eventDate));
  }

  public String buildHorseRacingSilkURL(ZonedDateTime eventDate, String fileName) {
    String path = buildHorseRacingSilkPath(eventDate);
    return buildURL(path, fileName);
  }

  // TODO parametrize hostname
  private String buildURL(String path, String fileName) {
    return String.format("https://assets.vidi.argyll.tech/%s/%s", path, fileName);
  }
}
