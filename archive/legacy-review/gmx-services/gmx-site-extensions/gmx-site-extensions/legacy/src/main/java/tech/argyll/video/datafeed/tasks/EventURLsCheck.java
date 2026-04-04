package tech.argyll.video.datafeed.tasks;

import static tech.argyll.video.common.http.HttpCallResponseHandler.NO_OP;

import java.util.List;
import java.util.stream.Collectors;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.fluent.Executor;
import org.apache.http.impl.client.HttpClientBuilder;
import org.slf4j.Logger;
import tech.argyll.video.common.http.GetMethodCall;
import tech.argyll.video.datafeed.tasks.EventURLsCheck.CheckResult;
import tech.argyll.video.domain.EventDao;
import tech.argyll.video.domain.model.EventModel;
import tech.argyll.video.domain.model.HorseRacingEventDetails;
import tech.argyll.video.domain.model.SportType;

@Slf4j
public class EventURLsCheck extends AbstractScheduledJob<List<CheckResult>> {

  private static final Executor REQUEST_EXECUTOR =
      Executor.newInstance(
          HttpClientBuilder.create()
              .disableRedirectHandling()
              .setDefaultRequestConfig(
                  RequestConfig.custom().setCookieSpec(CookieSpecs.STANDARD).build())
              .build());
  private static final GetMethodCall GET_URL_CALL = new GetMethodCall(REQUEST_EXECUTOR, false);

  @Override
  public Logger logger() {
    return log;
  }

  public List<CheckResult> doExecute() {
    List<EventModel> activeHorseRacing = EventDao.find.query()
        .where()
        .eq("sport", SportType.HORSE_RACING.getDbValue())
        .eq("processingInfo.status", "ACTIVE")
        .findList();

    List<CheckResult> urlsValidated = activeHorseRacing
        .stream()
//        .filter(e -> e.getId().equals("hX6-OVPEShOPdjgCRiL0kA"))
        .map(EventURLsCheck::testURL)
        .collect(Collectors.toList());

    log.info("Processed events - {}", urlsValidated.size());

    List<CheckResult> invalid = urlsValidated.stream()
        .filter(item -> !item.isValid())
        .collect(Collectors.toList());

    log.info("Found invalid - {}", invalid.size());
    if (invalid.size() > 0) {
      log.warn("Invalid URLs detected: {}",
          invalid.stream()
              .map(r -> String.format("%s, %tF %tR -> %s", r.event.getLeague(), r.event.getStartTime(), r.event.getStartTime(), r.getUrl()))
              .sorted()
              .collect( Collectors.joining(System.lineSeparator(), System.lineSeparator(), ""))
      );
    }

    return invalid;
  }

  public static CheckResult testURL(EventModel eventModel) {
    HorseRacingEventDetails details = (HorseRacingEventDetails) eventModel.getDetails();
    String url = details.getEventUrl();

    boolean isValid = isValid(url);
    return new CheckResult(eventModel, url, isValid);
  }

  public static boolean isValid(String url) {
    if (url.startsWith("https://www.sportnation.bet/en/")) {
      url = url.replace("/en/", "/");
    }

    boolean isValid = GET_URL_CALL.execute(url, NO_OP);
    log.debug("{} => {}", isValid ? "OK" : "NOT_EXIST", url);
    return isValid;
  }

  @Value
  public static class CheckResult {
    private EventModel event;
    private String url;
    private boolean valid;
  }
}
