package tech.argyll.video.datafeed.oddsfeed;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.function.Consumer;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.StatusLine;
import tech.argyll.video.common.http.HttpCallResponseHandler;

@Slf4j
public class OddsFeedResponseHandler extends HttpCallResponseHandler {

  private final ObjectMapper parser;

  public OddsFeedResponseHandler(Consumer<InputStream> onSuccess) {
    super(onSuccess);
    parser = new ObjectMapper();
  }

  @Override
  public boolean checkStatusAndConsumeResponse(HttpResponse response) throws IOException {
    StatusLine statusLine = response.getStatusLine();
    HttpEntity entity = response.getEntity();
    if (statusLine.getStatusCode() == 500) {
      ErrorResponse errorResponse = parseResponse(entity.getContent());

      log.warn(
          "Request returned status '{}'; reason '{}'; code '{}'; message '{}'",
          statusLine.getStatusCode(),
          statusLine.getReasonPhrase(),
          errorResponse.getCode(),
          errorResponse.getMessage());
      return false;
    }

    return super.checkStatusAndConsumeResponse(response);
  }

  private ErrorResponse parseResponse(InputStream content) throws IOException {
    return parser.readValue(content, ErrorResponse.class);
  }

  @Data
  public static class ErrorResponse extends AbstractResponse {}
}
