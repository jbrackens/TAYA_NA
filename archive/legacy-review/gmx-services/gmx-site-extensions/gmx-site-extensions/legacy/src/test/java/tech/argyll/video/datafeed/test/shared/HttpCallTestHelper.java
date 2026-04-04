package tech.argyll.video.datafeed.test.shared;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.io.InputStream;
import org.apache.http.HttpResponse;
import org.apache.http.ProtocolVersion;
import org.apache.http.entity.InputStreamEntity;
import org.apache.http.message.BasicStatusLine;

public class HttpCallTestHelper {
  public static HttpResponse constructSuccess(InputStream content) {
    HttpResponse result = mock(HttpResponse.class);
    given(result.getStatusLine())
        .willReturn(new BasicStatusLine(new ProtocolVersion("HTTP", 1, 1), 200, null));
    given(result.getEntity()).willReturn(new InputStreamEntity(content));
    return result;
  }
}
