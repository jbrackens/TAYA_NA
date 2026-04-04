package stella.identity.spi.impl;

import java.io.IOException;
import java.net.URI;
import java.time.OffsetDateTime;

import javax.ws.rs.NotFoundException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.jboss.logging.Logger;

import org.keycloak.connections.httpclient.HttpClientProvider;
import org.keycloak.models.KeycloakSession;

import stella.identity.event.StellaEvent;
import stella.identity.exception.EventPublishingException;
import stella.identity.json.OffsetDateTimeSerializer;
import stella.identity.spi.PublisherTokenProvider;
import stella.identity.spi.StellaEventPublisher;

public class StellaEventPublisherImpl implements StellaEventPublisher {

  private static final Logger logger = Logger.getLogger(StellaEventPublisherImpl.class);
  private static final ObjectMapper mapper = new ObjectMapper();
  private final HttpClient httpClient;
  private PublisherTokenProvider publisherTokenProvider;
  private KeycloakSession session;
  private final URI eventIngestorUri;

  static {
    SimpleModule serializerModule = new SimpleModule();
    serializerModule.addSerializer(OffsetDateTime.class, new OffsetDateTimeSerializer());
    mapper.registerModule(serializerModule);
  }

  public StellaEventPublisherImpl(KeycloakSession session, URI eventIngestorUri,
      PublisherTokenProvider publisherTokenProvider) {
    this.session = session;
    this.eventIngestorUri = eventIngestorUri;
    httpClient = session.getProvider(HttpClientProvider.class).getHttpClient();
    this.publisherTokenProvider = publisherTokenProvider;
  }

  @Override
  public void publish(StellaEvent event) {
    String token;
    try {
      token = publisherTokenProvider.getToken(session);
    } catch (NotFoundException e) {
      logger.error("Couldn't prepare publisher's token", e);
      throw new EventPublishingException("publication_misconfigured", e);
    }
    HttpPost httpPost = new HttpPost(eventIngestorUri);
    httpPost.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
    httpPost.setHeader(HttpHeaders.AUTHORIZATION, String.format("Bearer %s", token));
    try {
      String eventString = mapper.writeValueAsString(event);
      httpPost.setEntity(new StringEntity(eventString));
      HttpResponse response = httpClient.execute(httpPost);
      int statusCode = response.getStatusLine().getStatusCode();
      if (statusCode != 200) {
        logger.warn(String.format("Sending event error. Expected status 200 but received %d", statusCode));
        throw new EventPublishingException("event_publication_failed");
      }
    } catch (IOException e) {
      logger.warn("Sending event error", e);
    }
  }

  @Override
  public void close() {}
}
