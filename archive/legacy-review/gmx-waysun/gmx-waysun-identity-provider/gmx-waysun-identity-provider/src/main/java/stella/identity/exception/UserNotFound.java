package stella.identity.exception;

import javax.ws.rs.NotFoundException;

public class UserNotFound extends NotFoundException {

  public UserNotFound(String username) {
    super(String.format("User '%s' not found", username));
  }
}
