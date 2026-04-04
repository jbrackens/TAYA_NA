package stella.identity.spi;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.models.KeycloakSession;

import stella.identity.config.IdentityProviderConfig;
import stella.identity.config.ServiceConfig;
import stella.identity.event.EventMessageType;
import stella.identity.event.EventPayloadField;
import stella.identity.event.StellaEvent;

public class KeycloakEventListenerProvider implements EventListenerProvider {

  private final KeycloakSession session;

  private final StellaEventPublisher eventPublisher;
  private final IdentityProviderConfig.Identity_provider.Event_ingestor eventIngestorConfig;

  public KeycloakEventListenerProvider(KeycloakSession session) {
    this.session = session;
    eventPublisher = session.getProvider(StellaEventPublisher.class);
    eventIngestorConfig = ServiceConfig.getConfig().identity_provider.event_ingestor;
  }

  @Override
  public void onEvent(Event event) {
    if (EventType.LOGIN.equals(event.getType()) && !isPublisherUser()) {
      eventPublisher.publish(loggedInEvent(event));
    }
  }

  private boolean isPublisherUser() {
    String username = session.getContext().getAuthenticationSession().getAuthenticatedUser().getUsername();
    String realmId = session.getContext().getRealm().getId();
    return username.equals(eventIngestorConfig.publisher.username) && realmId.equals(eventIngestorConfig.publisher.realm);
  }

  private StellaEvent loggedInEvent(Event event) {
    EventPayloadField clientIdPayload = new EventPayloadField("clientId", "String", event.getClientId());
    List<EventPayloadField> details = detailsToPayload(event.getDetails());
    List<EventPayloadField> payload = new ArrayList<>();
    payload.add(clientIdPayload);
    payload.addAll(details);
    return StellaEvent.builder()
        .messageOriginDateUTC(OffsetDateTime.ofInstant(Instant.ofEpochMilli(event.getTime()), ZoneOffset.UTC))
        .messageType(EventMessageType.USER_LOGGED_IN)
        .payload(payload)
        .onBehalfOfUserId(event.getUserId())
        .build();
  }

  private List<EventPayloadField> detailsToPayload(Map<String, String> details) {
    List<EventPayloadField> payload = new ArrayList<>();
    addDetailsEntryToPayloadList(details, "auth_method", "details.authMethod", payload);
    addDetailsEntryToPayloadList(details, "grant_type", "details.grantType", payload);
    addDetailsEntryToPayloadList(details, "refresh_token_type", "details.refreshTokenType", payload);
    addDetailsEntryToPayloadList(details, "scope", "details.scope", payload);
    addDetailsEntryToPayloadList(details, "client_auth_method", "details.clientAuthMethod", payload);
    return payload;
  }

  private void addDetailsEntryToPayloadList(Map<String, String> details, String entryKey, String payloadKey,
      List<EventPayloadField> payload) {
    if (details.containsKey(entryKey)) {
      payload.add(new EventPayloadField(payloadKey, "String", details.get(entryKey)));
    }
  }

  @Override
  public void onEvent(AdminEvent event, boolean includeRepresentation) {}

  @Override
  public void close() {}
}
