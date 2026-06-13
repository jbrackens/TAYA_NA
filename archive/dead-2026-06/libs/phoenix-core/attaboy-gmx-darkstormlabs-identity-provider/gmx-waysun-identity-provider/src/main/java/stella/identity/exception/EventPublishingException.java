package stella.identity.exception;

import javax.ws.rs.InternalServerErrorException;

public class EventPublishingException extends InternalServerErrorException {

  public EventPublishingException(String message) {
    super(message);
  }

  public EventPublishingException(String message, Throwable cause) {
    super(message, cause);
  }
}
