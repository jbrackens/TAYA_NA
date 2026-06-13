package stella.identity.exception;

public class ProjectPublicIdNotFound extends Exception {

  public ProjectPublicIdNotFound(String clientId, Throwable cause) {
    super(String.format("Could not find project associated with client '%s'", clientId), cause);
  }
}
