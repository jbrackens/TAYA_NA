package stella.identity.spi;

import static org.mockito.Mockito.*;
import static org.testcontainers.shaded.org.apache.commons.lang.RandomStringUtils.randomAlphanumeric;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import org.keycloak.events.Event;
import org.keycloak.events.EventType;
import org.keycloak.models.KeycloakContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.sessions.AuthenticationSessionModel;

import stella.identity.config.IdentityProviderConfig;
import stella.identity.config.ServiceConfig;
import stella.identity.event.EventPayloadField;
import stella.identity.event.StellaEvent;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class KeycloakEventListenerProviderTest {

  @Mock
  private KeycloakSession keycloakSession;
  @Mock
  private StellaEventPublisher eventPublisher;
  @Mock
  private KeycloakContext keycloakContext;
  @Mock
  private AuthenticationSessionModel authenticationSessionModel;
  @Mock
  private UserModel userModel;
  @Mock
  private RealmModel realmModel;

  private final IdentityProviderConfig.Identity_provider.Event_ingestor eventIngestorConfig = ServiceConfig
      .getConfig().identity_provider.event_ingestor;

  @BeforeEach
  private void init() {
    when(keycloakSession.getProvider(StellaEventPublisher.class)).thenReturn(eventPublisher);
    when(keycloakSession.getContext()).thenReturn(keycloakContext);
    when(keycloakContext.getAuthenticationSession()).thenReturn(authenticationSessionModel);
    when(keycloakContext.getRealm()).thenReturn(realmModel);
    when(authenticationSessionModel.getAuthenticatedUser()).thenReturn(userModel);
  }

  private final Event loginEvent = loginEvent();

  @Test
  void shouldPublishLoginEvent() {
    when(userModel.getUsername()).thenReturn("authenticated-user-username");
    when(realmModel.getId()).thenReturn("master");

    new KeycloakEventListenerProvider(keycloakSession).onEvent(loginEvent);

    verify(eventPublisher).publish(stellaLoginEvent(loginEvent));
  }

  @Test
  void shouldNotPublishLoginEventForPublisherUser() {
    when(userModel.getUsername()).thenReturn(eventIngestorConfig.publisher.username);
    when(realmModel.getId()).thenReturn(eventIngestorConfig.publisher.realm);

    new KeycloakEventListenerProvider(keycloakSession).onEvent(loginEvent);

    verifyNoInteractions(eventPublisher);
  }

  @Test
  void shouldPublishLoginEventForUsernameTheSameAsPublisherButDifferentRealm() {
    when(userModel.getUsername()).thenReturn(eventIngestorConfig.publisher.username);
    when(realmModel.getId()).thenReturn(UUID.randomUUID().toString());

    new KeycloakEventListenerProvider(keycloakSession).onEvent(loginEvent);

    verify(eventPublisher).publish(stellaLoginEvent(loginEvent));
  }

  @ParameterizedTest
  @MethodSource("notPublishableEventTypes")
  void shouldNotPublishOtherEvents(EventType eventType) {
    when(userModel.getUsername()).thenReturn(randomAlphanumeric(20));
    when(realmModel.getId()).thenReturn(randomAlphanumeric(20));
    Event event = loginEvent();
    event.setType(eventType);

    new KeycloakEventListenerProvider(keycloakSession).onEvent(event);

    verifyNoInteractions(eventPublisher);
  }

  private static Stream<EventType> notPublishableEventTypes() {
    return Arrays.stream(EventType.values()).filter(eventType -> eventType != EventType.LOGIN);
  }

  private Event loginEvent() {
    Event loginEvent = new Event();
    loginEvent.setType(EventType.LOGIN);
    loginEvent.setUserId(randomAlphanumeric(20));
    loginEvent.setClientId(randomAlphanumeric(20));
    loginEvent.setTime(System.currentTimeMillis());
    Map<String, String> details = new HashMap<>();
    details.put("auth_method", randomAlphanumeric(20));
    details.put("grant_type", randomAlphanumeric(20));
    details.put("refresh_token_type", randomAlphanumeric(20));
    details.put("scope", randomAlphanumeric(20));
    details.put("client_auth_method", randomAlphanumeric(20));
    details.put("this_content_can_not_be_publish", randomAlphanumeric(20));
    loginEvent.setDetails(details);
    return loginEvent;
  }

  private StellaEvent stellaLoginEvent(Event event) {
    EventPayloadField client = new EventPayloadField("clientId", "String", event.getClientId());
    EventPayloadField authMethod = new EventPayloadField("details.authMethod", "String", event.getDetails().get("auth_method"));
    EventPayloadField clientAuthMethod = new EventPayloadField("details.clientAuthMethod", "String",
        event.getDetails().get("client_auth_method"));
    EventPayloadField grantType = new EventPayloadField("details.grantType", "String", event.getDetails().get("grant_type"));
    EventPayloadField refreshTokenType = new EventPayloadField("details.refreshTokenType", "String",
        event.getDetails().get("refresh_token_type"));
    EventPayloadField scope = new EventPayloadField("details.scope", "String", event.getDetails().get("scope"));
    return StellaEvent.builder()
        .messageType("internal.identityProvider.UserLoggedIn")
        .onBehalfOfUserId(event.getUserId())
        .messageOriginDateUTC(OffsetDateTime.ofInstant(Instant.ofEpochMilli(event.getTime()), ZoneOffset.UTC))
        .payload(List.of(client, authMethod, grantType, refreshTokenType, scope, clientAuthMethod))
        .build();
  }

}
