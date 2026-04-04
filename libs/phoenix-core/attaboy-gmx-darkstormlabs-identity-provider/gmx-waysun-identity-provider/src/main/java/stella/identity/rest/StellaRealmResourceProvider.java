package stella.identity.rest;

import org.keycloak.models.KeycloakSession;
import org.keycloak.services.resource.RealmResourceProvider;

public class StellaRealmResourceProvider implements RealmResourceProvider {

  private KeycloakSession session;

  public StellaRealmResourceProvider(KeycloakSession session) {
    this.session = session;
  }

  @Override
  public Object getResource() {
    return new StellaRestResource(session);
  }

  @Override
  public void close() {}
}
