package stella.identity.rest;

import java.util.UUID;
import java.util.function.Supplier;

import javax.ws.rs.core.HttpHeaders;

import org.slf4j.MDC;

public interface RequestCorrelationIdSupport {

  String CORRELATION_ID_HEADER = "X-Api-Message-Id";
  String CORRELATION_ID_KEY = "correlationId";

  default <T> T withLogCorrelationId(HttpHeaders headers, Supplier<T> body) {
    String correlationId = headers.getHeaderString(CORRELATION_ID_HEADER);
    setLogCorrelationId(correlationId);
    try {
      return body.get();
    } finally {
      cleanLogCorrelationId();
    }
  }

  private String generateCorrelationId() {
    // a prefix shows that a header was not set and the id originated here
    return String.format("generated-%s", UUID.randomUUID());
  }

  private void setLogCorrelationId(String correlationId) {
    String cid = correlationId != null ? correlationId : generateCorrelationId();
    MDC.put(CORRELATION_ID_KEY, cid);
  }

  private void cleanLogCorrelationId() {
    MDC.remove(CORRELATION_ID_KEY);
  }
}
