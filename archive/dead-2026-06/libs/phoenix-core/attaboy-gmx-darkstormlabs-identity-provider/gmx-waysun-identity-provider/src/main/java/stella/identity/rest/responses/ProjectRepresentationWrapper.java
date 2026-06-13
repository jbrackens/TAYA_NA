package stella.identity.rest.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import stella.identity.model.ProjectRepresentation;
import stella.identity.rest.ResponseWrapper;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectRepresentationWrapper implements ResponseWrapper<ProjectRepresentation> {

  private String status;
  private ProjectRepresentation details;

  public static ProjectRepresentationWrapper asSuccess(ProjectRepresentation details) {
    return new ProjectRepresentationWrapper(OK_STATUS, details);
  }
}
