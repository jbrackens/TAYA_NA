package stella.identity.exception;

import javax.ws.rs.BadRequestException;

public class MissingRequiredParamException extends BadRequestException {

  public MissingRequiredParamException(String paramName) {
    super(String.format("'%s' is required", paramName));
  }
}
