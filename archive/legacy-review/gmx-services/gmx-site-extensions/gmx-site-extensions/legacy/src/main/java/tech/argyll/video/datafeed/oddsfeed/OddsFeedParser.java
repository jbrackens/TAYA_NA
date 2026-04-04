package tech.argyll.video.datafeed.oddsfeed;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import javax.inject.Inject;
import org.apache.http.HttpEntity;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;

public class OddsFeedParser {

  private final ObjectMapper objectMapper;

  @Inject
  public OddsFeedParser(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public HttpEntity prepareRequest(Object request) throws JsonProcessingException {
    String result = objectMapper.writeValueAsString(request);
    return new StringEntity(result, ContentType.APPLICATION_JSON);
  }

  public <T> T parseResponse(InputStream content, Class<T> clazz) throws IOException {
    return objectMapper.readValue(content, clazz);
  }
}
