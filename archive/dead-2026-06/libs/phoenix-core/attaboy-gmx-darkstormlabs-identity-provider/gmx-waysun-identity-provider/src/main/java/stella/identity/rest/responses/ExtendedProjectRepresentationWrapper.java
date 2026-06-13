package stella.identity.rest.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import stella.identity.model.ExtendedProjectRepresentation;
import stella.identity.rest.ResponseWrapper;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ExtendedProjectRepresentationWrapper implements ResponseWrapper<ExtendedProjectRepresentation> {

  private String status;
  private ExtendedProjectRepresentation details;

  public static ExtendedProjectRepresentationWrapper asSuccess(ExtendedProjectRepresentation details) {
    return new ExtendedProjectRepresentationWrapper(OK_STATUS, details);
  }
}
