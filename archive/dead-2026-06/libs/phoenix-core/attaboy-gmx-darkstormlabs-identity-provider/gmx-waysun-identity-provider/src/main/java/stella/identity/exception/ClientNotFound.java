package stella.identity.exception;

import javax.ws.rs.NotFoundException;

public class ClientNotFound extends NotFoundException {

  public ClientNotFound(String clientId) {
    super(String.format("Client '%s' not found", clientId));
  }
}
