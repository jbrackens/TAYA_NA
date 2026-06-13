package stella.identity.auth;

public interface AuthResult {

  String getClientId();

  boolean hasPermission(String permission);

  boolean hasSignBehalfOfPermission();
}
