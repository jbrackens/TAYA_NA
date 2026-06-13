package stella.identity.exception;

import javax.ws.rs.ClientErrorException;
import javax.ws.rs.core.Response;

public class ProjectAlreadyExists extends ClientErrorException {

  public ProjectAlreadyExists() {
    super(Response.Status.CONFLICT);
  }
}
