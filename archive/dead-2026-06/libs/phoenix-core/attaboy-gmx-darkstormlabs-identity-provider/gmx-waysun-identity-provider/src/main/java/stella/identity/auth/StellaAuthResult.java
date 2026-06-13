package stella.identity.auth;

import stella.identity.Permissions;
import stella.identity.jwt.JwtExtraField;

public class StellaAuthResult implements AuthResult {

  private StellaToken token;

  private JwtExtraField extra;

  public StellaAuthResult(StellaToken token, JwtExtraField extra) {
    this.token = token;
    this.extra = extra;
  }

  @Override
  public String getClientId() {
    return token.getIssuedFor();
  }

  @Override
  public boolean hasPermission(String permission) {
    return extra.getJpk().contains(permission);
  }

  @Override
  public boolean hasSignBehalfOfPermission() {
    return extra.getJpk().stream()
        .filter(permission -> permission.startsWith(Permissions.OIDC_ADMIN_SIGN_BEHALF_OF_PREFIX))
        .findAny()
        .isPresent();
  }
}
