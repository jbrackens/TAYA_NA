package tech.argyll.video.datafeed.oddsfeed;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.InputStream;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpEntity;
import org.slf4j.MDC;
import tech.argyll.video.common.UUID;
import tech.argyll.video.common.http.PostMethodCall;
import tech.argyll.video.core.sbtech.SBTechOperatorType;

@Slf4j
public abstract class OddsFeedPostOperation implements Runnable {

  private final String url;

  protected final SBTechOperatorType operator;

  private final PostMethodCall postMethodCall;

  public OddsFeedPostOperation(SBTechOperatorType operator, PostMethodCall postMethodCall) {
    this.url = buildURL(operator);
    this.operator = operator;
    this.postMethodCall = postMethodCall;
  }

  @Override
  public void run() {
    String executionId = UUID.uuid();
    MDC.put("executionId", executionId);
    log.info("Starting SYNC - JSON API {}", getOperation());

    try {
      postMethodCall.execute(
          url,
          prepareRequest(),
          new OddsFeedResponseHandler(
              content -> {
                this.processResponse(content);
                log.info("Successfully finished SYNC - JSON API {}", getOperation());
              }));
    } catch (JsonProcessingException e) {
      log.error("Error preparing request");
    } finally {
      MDC.remove("executionId");
    }
  }

  private String buildURL(SBTechOperatorType operator) {
    return String.format(
        "https://oddsfeed-%s.sbtech.com/%s", operator.getSbtechName(), getOperation());
  }

  protected abstract String getOperation();

  protected abstract HttpEntity prepareRequest() throws JsonProcessingException;

  protected abstract void processResponse(InputStream inputStream);
}
