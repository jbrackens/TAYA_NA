package stella.identity.rest.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import stella.identity.rest.ResponseWrapper;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SignatureResponseWrapper implements ResponseWrapper<SignatureResponse> {

  private String status;
  private SignatureResponse details;

  public static SignatureResponseWrapper asSuccess(String signature) {
    return new SignatureResponseWrapper(OK_STATUS, new SignatureResponse(signature));
  }
}
