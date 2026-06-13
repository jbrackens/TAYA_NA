package stella.identity.repository;

import javax.persistence.EntityManager;

import org.keycloak.connections.jpa.JpaConnectionProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;

public abstract class RepositoryBase {

  protected final KeycloakSession session;

  public RepositoryBase(KeycloakSession session) {
    this.session = session;
    if (getRealm() == null) {
      throw new IllegalStateException(
          "The service cannot accept a session without a realm in its context.");
    }
  }

  protected EntityManager getEntityManager() {
    return session.getProvider(JpaConnectionProvider.class).getEntityManager();
  }

  protected RealmModel getRealm() {
    return session.getContext().getRealm();
  }

}
