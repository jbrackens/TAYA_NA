package stella.identity.rest.responses;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import stella.identity.model.ProjectRepresentation;
import stella.identity.rest.ResponseWrapper;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectRepresentationListWrapper implements ResponseWrapper<List<ProjectRepresentation>> {

  private String status;
  private List<ProjectRepresentation> details;

  public static ProjectRepresentationListWrapper asSuccess(List<ProjectRepresentation> details) {
    return new ProjectRepresentationListWrapper(OK_STATUS, details);
  }
}
