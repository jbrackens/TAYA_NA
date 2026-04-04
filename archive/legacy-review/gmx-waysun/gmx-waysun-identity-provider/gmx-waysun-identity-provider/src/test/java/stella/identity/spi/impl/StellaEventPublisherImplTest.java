package stella.identity.spi.impl;

import static org.apache.commons.lang.RandomStringUtils.randomAlphanumeric;
import static org.mockito.Mockito.when;
import static org.mockserver.model.HttpRequest.request;
import static org.mockserver.model.HttpResponse.response;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.apache.http.HttpHeaders;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockserver.client.MockServerClient;
import org.mockserver.junit.jupiter.MockServerExtension;
import org.mockserver.verify.VerificationTimes;

import org.keycloak.connections.httpclient.HttpClientProvider;
import org.keycloak.models.KeycloakSession;

import stella.identity.event.EventMessageType;
import stella.identity.event.EventPayloadField;
import stella.identity.event.StellaEvent;
import stella.identity.json.OffsetDateTimeSerializer;
import stella.identity.spi.PublisherTokenProvider;

@ExtendWith({MockitoExtension.class, MockServerExtension.class})
class StellaEventPublisherImplTest {

  private MockServerClient client;

  private String eventIngestorPath = "/event_ingestor/admin/any/event";
  private URI ingestorUri;
  private String publisherToken = randomAlphanumeric(20);

  @BeforeEach
  public void beforeEach(MockServerClient client) {
    this.client = client;
    ingestorUri = URI.create(String.format("http://%s:%s%s", client.remoteAddress().getHostString(),
        client.remoteAddress().getPort(), eventIngestorPath));
    client.when(
        request()
            .withMethod("POST")
            .withPath("/event_ingestor/admin/any/event"))
        .respond(
            response().withStatusCode(200));
  }

  @Mock
  private KeycloakSession keycloakSession;
  @Mock
  private HttpClientProvider httpClientProvider;

  private CloseableHttpClient httpClient = HttpClients.createDefault();

  @Test
  void shouldSendEventToEventIngestor() throws JsonProcessingException {
    when(keycloakSession.getProvider(HttpClientProvider.class)).thenReturn(httpClientProvider);
    when(httpClientProvider.getHttpClient()).thenReturn(httpClient);

    StellaEventPublisherImpl publisher = new StellaEventPublisherImpl(keycloakSession, ingestorUri,
        new DummyPublisherTokenProvider());

    StellaEvent event = randomEvent();
    publisher.publish(event);

    client.verify(
        request()
            .withMethod("POST")
            .withPath("/event_ingestor/admin/any/event")
            .withHeader(HttpHeaders.CONTENT_TYPE, "application/json")
            .withHeader(HttpHeaders.AUTHORIZATION, String.format("Bearer %s", publisherToken))
            .withBody(toJsonString(event)),
        VerificationTimes.once());
  }

  private StellaEvent randomEvent() {
    EventPayloadField payloadField1 = new EventPayloadField(randomAlphanumeric(10), "String", randomAlphanumeric(20));
    EventPayloadField payloadField2 = new EventPayloadField(randomAlphanumeric(10), "Int", randomAlphanumeric(20));
    return StellaEvent.builder()
        .messageOriginDateUTC(OffsetDateTime.now())
        .messageType(EventMessageType.USER_LOGGED_IN)
        .onBehalfOfUserId(randomAlphanumeric(20))
        .payload(List.of(payloadField1, payloadField2))
        .build();
  }

  private String toJsonString(StellaEvent event) throws JsonProcessingException {
    ObjectMapper mapper = new ObjectMapper();
    SimpleModule serializerModule = new SimpleModule();
    serializerModule.addSerializer(OffsetDateTime.class, new OffsetDateTimeSerializer());
    mapper.registerModule(serializerModule);
    return mapper.writeValueAsString(event);
  }

  private class DummyPublisherTokenProvider implements PublisherTokenProvider {

    @Override
    public String getToken(KeycloakSession session) {
      return publisherToken;
    }
  }

}
