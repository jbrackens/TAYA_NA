package stella.identity.spi.impl;

import org.keycloak.common.ClientConnection;
import org.keycloak.common.util.Time;
import org.keycloak.events.EventBuilder;
import org.keycloak.models.*;
import org.keycloak.protocol.oidc.OIDCLoginProtocol;
import org.keycloak.protocol.oidc.TokenManager;
import org.keycloak.representations.IDToken;
import org.keycloak.services.Urls;
import org.keycloak.services.util.DefaultClientSessionContext;

import stella.identity.config.IdentityProviderConfig;
import stella.identity.config.ServiceConfig;
import stella.identity.exception.ClientNotFound;
import stella.identity.exception.RealmNotFound;
import stella.identity.exception.UserNotFound;
import stella.identity.spi.PublisherTokenProvider;

public final class PublisherTokenProviderImpl implements PublisherTokenProvider {

  private IDToken publisherIdToken;
  private final IdentityProviderConfig.Identity_provider.Event_ingestor.Publisher eventPublisherConfig;

  public PublisherTokenProviderImpl() {
    eventPublisherConfig = ServiceConfig.getConfig().identity_provider.event_ingestor.publisher;
  }

  public synchronized String getToken(KeycloakSession session) {
    if (publisherIdToken == null || newTokenIsRequired()) {
      publisherIdToken = generatePublisherToken(session);
    }
    return session.tokens().encodeAndEncrypt(publisherIdToken);
  }

  private boolean newTokenIsRequired() {
    return (Time.currentTime() + eventPublisherConfig.minimum_remaining_seconds_to_expire) > publisherIdToken.getExp();
  }

  private IDToken generatePublisherToken(KeycloakSession keycloakSession) {
    RealmModel realm = keycloakSession.realms().getRealm(eventPublisherConfig.realm);
    if (realm == null)
      throw new RealmNotFound(eventPublisherConfig.realm);
    ClientModel client = keycloakSession.clients().getClientByClientId(realm, eventPublisherConfig.client_id);
    if (client == null)
      throw new ClientNotFound(eventPublisherConfig.client_id);
    UserModel publisher = keycloakSession.users().getUserByUsername(realm, eventPublisherConfig.username);
    if (publisher == null)
      throw new UserNotFound(eventPublisherConfig.username);

    EventBuilder eventBuilder = new EventBuilder(realm, keycloakSession, new InternalClientConnection());
    UserSessionModel userSession = keycloakSession.sessions().createUserSession(realm, publisher, publisher.getUsername(),
        "127.0.0.1",
        "openid-connect", true, null, null);
    AuthenticatedClientSessionModel clientSession = keycloakSession.sessions().createClientSession(realm, client, userSession);
    clientSession.setNote(OIDCLoginProtocol.ISSUER,
        Urls.realmIssuer(keycloakSession.getContext().getUri().getBaseUri(), realm.getName()));
    ClientSessionContext clientSessionContext = DefaultClientSessionContext.fromClientSessionScopeParameter(clientSession,
        keycloakSession);
    TokenManager tokenManager = new TokenManager();
    TokenManager.AccessTokenResponseBuilder tokenBuilder = tokenManager.responseBuilder(realm, client,
        eventBuilder, keycloakSession, userSession, clientSessionContext);
    tokenBuilder.generateAccessToken();
    tokenBuilder.generateIDToken();

    return tokenBuilder.getIdToken();
  }

  private class InternalClientConnection implements ClientConnection {

    @Override
    public String getRemoteAddr() {
      return "127.0.0.1";
    }

    @Override
    public String getRemoteHost() {
      return "keycloak";
    }

    @Override
    public int getRemotePort() {
      return -1;
    }

    @Override
    public String getLocalAddr() {
      return "localhost";
    }

    @Override
    public int getLocalPort() {
      return -2;
    }
  }
}
