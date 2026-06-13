package stella.identity.exception;

import java.util.UUID;

import javax.ws.rs.NotFoundException;

public class ProjectNotFound extends NotFoundException {

  public ProjectNotFound(UUID projectPublicId) {
    super(String.format("Project '%s' not found", projectPublicId));
  }

  public ProjectNotFound(Long projectId) {
    super(String.format("Project '%s' not found", projectId));
  }
}
