package stella.identity.exception;

import javax.ws.rs.NotFoundException;

public class RealmNotFound extends NotFoundException {

  public RealmNotFound(String realmId) {
    super(String.format("Realm '%s' not found", realmId));
  }
}
