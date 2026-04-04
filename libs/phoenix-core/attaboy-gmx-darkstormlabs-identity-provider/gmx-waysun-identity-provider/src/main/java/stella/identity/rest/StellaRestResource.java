package stella.identity.rest;

import javax.ws.rs.NotAuthorizedException;
import javax.ws.rs.Path;

import org.keycloak.common.VerificationException;
import org.keycloak.models.KeycloakSession;

import stella.identity.auth.AuthResult;
import stella.identity.auth.StellaTokenAuthenticator;

public class StellaRestResource {

  private KeycloakSession session;
  private final StellaTokenAuthenticator authManager;

  public StellaRestResource(KeycloakSession session) {
    this.session = session;
    this.authManager = new StellaTokenAuthenticator(session);
  }

  @Path("admin")
  public AdminResource getAdminResource() {
    AuthResult authResult = validateToken();
    return new AdminResource(session, authResult);
  }

  @Path("projects")
  public ProjectResource getProjectResource() {
    AuthResult authResult = validateToken();
    return new ProjectResource(session, authResult);
  }

  @Path("clients")
  public ClientResource getClientResource() {
    AuthResult authResult = validateToken();
    return new ClientResource(session, authResult);
  }

  private AuthResult validateToken() {
    try {
      return authManager.authenticate();
    } catch (VerificationException e) {
      throw new NotAuthorizedException("Token verification error", e);
    }
  }
}
