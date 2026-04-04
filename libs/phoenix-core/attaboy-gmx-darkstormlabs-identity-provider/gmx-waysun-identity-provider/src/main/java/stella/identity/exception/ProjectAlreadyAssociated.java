package stella.identity.exception;

import java.util.UUID;

import javax.ws.rs.ClientErrorException;
import javax.ws.rs.core.Response;

public class ProjectAlreadyAssociated extends ClientErrorException {

  public ProjectAlreadyAssociated(UUID projectPublicId) {
    super(String.format("Project '%s' is already associated with the client", projectPublicId.toString()),
        Response.Status.CONFLICT);
  }
}
