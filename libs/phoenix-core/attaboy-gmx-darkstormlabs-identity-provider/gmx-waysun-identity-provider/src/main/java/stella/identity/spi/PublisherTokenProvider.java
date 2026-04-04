package stella.identity.spi;

import org.keycloak.models.KeycloakSession;

public interface PublisherTokenProvider {

  String getToken(KeycloakSession session);
}
