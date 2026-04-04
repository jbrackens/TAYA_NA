package stella.identity.rest;

import javax.ws.rs.ForbiddenException;

import org.keycloak.models.KeycloakSession;

import stella.identity.auth.AuthResult;

public abstract class BaseResource {

  protected KeycloakSession session;
  protected AuthResult authResult;

  public BaseResource(KeycloakSession session, AuthResult authResult) {
    this.session = session;
    this.authResult = authResult;
  }

  protected boolean hasPermission(String permission) {
    if (authResult == null)
      throw new ForbiddenException(ErrorCode.MISSING_OR_INVALID_TOKEN);
    return authResult.hasPermission(permission);
  }

  protected void checkPermissionOrFail(String permission) {
    if (!hasPermission(permission))
      throw new ForbiddenException(ErrorCode.MISSING_PERMISSION);
  }

  protected void checkIfHasSignBehalfOfPermissionOrFail() {
    if (authResult == null)
      throw new ForbiddenException(ErrorCode.MISSING_OR_INVALID_TOKEN);
    if (!authResult.hasSignBehalfOfPermission())
      throw new ForbiddenException(ErrorCode.MISSING_PERMISSION);
  }

}
