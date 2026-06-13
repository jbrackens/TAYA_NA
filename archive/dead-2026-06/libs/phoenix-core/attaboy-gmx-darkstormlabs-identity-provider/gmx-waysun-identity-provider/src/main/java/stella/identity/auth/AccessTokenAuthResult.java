package stella.identity.auth;

import org.keycloak.representations.AccessToken;

import stella.identity.Permissions;

public class AccessTokenAuthResult implements AuthResult {

  private final AccessToken token;

  public AccessTokenAuthResult(AccessToken token) {
    this.token = token;
  }

  @Override
  public String getClientId() {
    return token.getIssuedFor();
  }

  @Override
  public boolean hasPermission(String permission) {
    return hasRealmAccessRolesDefined() && token.getRealmAccess().getRoles().contains(permission);
  }

  @Override
  public boolean hasSignBehalfOfPermission() {
    return hasRealmAccessRolesDefined() && token.getRealmAccess().getRoles().stream()
        .anyMatch(permission -> permission.startsWith(Permissions.OIDC_ADMIN_SIGN_BEHALF_OF_PREFIX));
  }

  private boolean hasRealmAccessRolesDefined() {
    return token.getRealmAccess() != null && token.getRealmAccess().getRoles() != null;
  }
}
