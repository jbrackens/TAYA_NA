package tech.argyll.video.datafeed.oddsfeed;

import java.io.InputStream;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import tech.argyll.video.common.UUID;
import tech.argyll.video.common.http.GetMethodCall;
import tech.argyll.video.core.sbtech.SBTechOperatorType;

@Slf4j
public abstract class OddsFeedGetOperation implements Runnable {

  private final String url;

  protected final SBTechOperatorType operator;

  private final GetMethodCall getMethodCall;

  public OddsFeedGetOperation(SBTechOperatorType operator, GetMethodCall getMethodCall) {
    this.url = buildURL(operator);
    this.operator = operator;
    this.getMethodCall = getMethodCall;
  }

  @Override
  public void run() {
    String executionId = UUID.uuid();
    MDC.put("executionId", executionId);
    log.info("Starting SYNC - JSON API {}", getOperation());

    try {
      getMethodCall.execute(
          url,
          new OddsFeedResponseHandler(
              content -> {
                this.processResponse(content);
                log.info("Successfully finished SYNC - JSON API {}", getOperation());
              }));
    } finally {
      MDC.remove("executionId");
    }
  }

  private String buildURL(SBTechOperatorType operator) {
    return String.format(
        "https://oddsfeed-%s.sbtech.com/%s", operator.getSbtechName(), getOperation());
  }

  protected abstract String getOperation();

  protected abstract void processResponse(InputStream inputStream);
}
